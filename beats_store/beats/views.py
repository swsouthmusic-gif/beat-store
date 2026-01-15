from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404, JsonResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import os
import stripe
import json
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import User
from .models import Beat, Purchase, StripeWebhookEvent, UserProfile
from .serializers import BeatSerializer, PurchaseSerializer, UserSerializer, UserRegistrationSerializer

# Initialize logger first
logger = logging.getLogger(__name__)

# Configure Stripe (only if key is available)
if hasattr(settings, 'STRIPE_SECRET_KEY') and settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    logger.warning("STRIPE_SECRET_KEY is not configured. Payment processing will not work.")


class OptionalJWTAuthentication(JWTAuthentication):
    """JWT Authentication that doesn't raise exceptions on invalid tokens.
    Useful for public endpoints where invalid tokens should be treated as unauthenticated."""
    
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, TokenError):
            # Return None to indicate authentication failed, but don't raise an exception
            # This allows the view to proceed with an unauthenticated user
            return None

class BeatViewSet(viewsets.ModelViewSet):
    queryset = Beat.objects.all().order_by('-created_at')
    serializer_class = BeatSerializer
    filterset_fields = ['genre', 'bpm', 'scale']
    
    # Use OptionalJWTAuthentication for all actions to handle invalid tokens gracefully
    # Valid tokens will still authenticate, but invalid tokens won't cause 403 errors
    authentication_classes = [OptionalJWTAuthentication]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:  # allow public access to list and retrieve
            return [IsAuthenticatedOrReadOnly()]
        if self.action in ["download", "purchase", "create_payment_intent", "confirm_payment", "check_purchase"]:  # custom actions
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def list(self, request, *args, **kwargs):
        """Override list to handle filter validation errors gracefully"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            # Log the error for debugging
            logger.error(f"Error in BeatViewSet.list: {str(e)}", exc_info=True)
            # Return a proper JSON error response
            return Response(
                {'error': 'Invalid filter parameters', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def create_payment_intent(self, request, pk=None):
        """Create a Stripe Payment Intent for the beat purchase"""
        beat = self.get_object()
        download_type = request.data.get('download_type')

        # Validate download type
        if download_type not in ('mp3', 'wav', 'stems'):
            return Response(
                {'error': 'Invalid download_type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Compute price on server based on download type
        if download_type == 'mp3':
            price = beat.mp3_price
        elif download_type == 'wav':
            price = beat.wav_price
        else:  # stems
            price = beat.stems_price

        if price is None:
            return Response(
                {'error': 'No price set for this download type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if file exists for the download type
        file_field = f'{download_type}_file'
        file_obj = getattr(beat, file_field, None)
        if not file_obj:
            return Response(
                {'error': f'{download_type.upper()} file not available for this beat'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already has this purchase
        existing_purchase = Purchase.objects.filter(
            user=request.user,
            beat=beat,
            download_type=download_type,
            payment_status='completed'
        ).first()
        
        if existing_purchase:
            return Response(
                {'error': 'You have already purchased this download type for this beat'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if Stripe is configured
        if not hasattr(settings, 'STRIPE_SECRET_KEY') or not settings.STRIPE_SECRET_KEY:
            logger.error("STRIPE_SECRET_KEY is not configured in settings")
            return Response(
                {'error': 'Payment processing is not configured. Please contact support.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Ensure Stripe API key is set (in case it wasn't set at module level)
        if not stripe.api_key:
            stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Stripe expects integer cents
        amount_cents = int(round(float(price) * 100))
        if amount_cents <= 0:
            return Response(
                {'error': 'Invalid price amount'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create Stripe Payment Intent
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                automatic_payment_methods={
                    'enabled': True,
                },
                metadata={
                    'beat_id': str(beat.id),
                    'download_type': download_type,
                    'user_id': str(request.user.id) if request.user.is_authenticated else '',
                    'beat_name': beat.name,
                },
            )
            
            return Response(
                {
                    'client_secret': intent.client_secret,
                    'payment_intent_id': intent.id,
                },
                status=status.HTTP_200_OK,
            )
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return Response(
                {'error': f'Payment processing error: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        """Confirm payment completion and create purchase record"""
        beat = self.get_object()
        payment_intent_id = request.data.get('payment_intent_id')
        download_type = request.data.get('download_type')
        price_paid = request.data.get('price_paid')
        
        if not payment_intent_id:
            return Response(
                {'error': 'payment_intent_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify payment intent with Stripe
            if not hasattr(settings, 'STRIPE_SECRET_KEY') or not settings.STRIPE_SECRET_KEY:
                return Response(
                    {'error': 'Payment processing is not configured'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            if not stripe.api_key:
                stripe.api_key = settings.STRIPE_SECRET_KEY
            
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Verify payment was successful
            if intent.status != 'succeeded':
                return Response(
                    {'error': f'Payment intent status is {intent.status}, not succeeded'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if purchase already exists (might have been created by webhook)
            purchase, created = Purchase.objects.get_or_create(
                user=request.user,
                beat=beat,
                download_type=download_type or intent.metadata.get('download_type', 'mp3'),
                defaults={
                    'price_paid': price_paid or float(intent.amount) / 100,
                    'payment_method': 'stripe',
                    'payment_status': 'completed',
                    'stripe_payment_intent_id': payment_intent_id,
                }
            )
            
            # If purchase already existed, update it
            if not created:
                purchase.payment_status = 'completed'
                purchase.stripe_payment_intent_id = payment_intent_id
                purchase.save()
            
            logger.info(f"Payment confirmed for purchase {purchase.id}")
            
            return Response({
                'message': 'Payment confirmed successfully',
                'purchase_id': purchase.id,
                'download_type': purchase.download_type
            })
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {e}")
            return Response(
                {'error': f'Stripe error: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error confirming payment: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Error confirming payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def check_purchase(self, request, pk=None):
        """Check if user has already purchased this beat/download type"""
        beat = self.get_object()
        # Print full object details for debugging
        print(f"Beat object: {beat}")
        print(f"Beat ID: {beat.id}, Name: {beat.name}, Type: {type(beat)}")
        download_type = request.query_params.get('type', 'mp3')
        
        # Validate download type
        valid_types = ['mp3', 'wav', 'stems']
        if download_type not in valid_types:
            return Response(
                {'error': f'Invalid download type. Must be one of {valid_types}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has completed purchase for this download type
        purchase = Purchase.objects.filter(
            user=request.user,
            beat=beat,
            download_type=download_type,
            payment_status='completed'
        ).first()
        
        # Log for debugging
        logger.info(f"check_purchase: user={request.user.id}, beat={beat.id}, download_type={download_type}, found_purchase={purchase is not None}")
        if purchase:
            logger.info(f"Purchase found: id={purchase.id}, status={purchase.payment_status}")
        else:
            # Log all purchases for this user/beat to help debug
            all_purchases = Purchase.objects.filter(
                user=request.user,
                beat=beat,
                download_type=download_type
            )
            logger.info(f"No completed purchase found. All purchases for this user/beat/type: {list(all_purchases.values('id', 'payment_status', 'download_type'))}")
        
        if purchase:
            return Response({
                'has_purchase': True,
                'purchase_id': purchase.id,
                'download_type': purchase.download_type,
                'purchased_at': purchase.created_at
            })
        else:
            return Response({
                'has_purchase': False
            })

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the beat file"""
        beat = self.get_object()
        download_type = request.query_params.get('type', 'mp3')
        
        # Validate download type
        valid_types = ['mp3', 'wav', 'stems']
        if download_type not in valid_types:
            return Response(
                {'error': f'Invalid download type. Must be one of {valid_types}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has completed purchase for this download type
        has_purchase = Purchase.objects.filter(
            user=request.user,
            beat=beat,
            download_type=download_type,
            payment_status='completed'
        ).exists()
        
        if not has_purchase:
            return Response(
                {'error': 'You must complete the purchase before accessing this download'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the file
        file_field = f'{download_type}_file'
        file_obj = getattr(beat, file_field, None)
        
        if not file_obj:
            return Response(
                {'error': f'{download_type.upper()} file not available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serve the file
        file_path = file_obj.path
        if not os.path.exists(file_path):
            return Response(
                {'error': 'File not found on server'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            # Set appropriate content type and file extension
            if download_type == 'stems':
                content_type = 'application/zip'
                file_extension = 'zip'
            elif download_type == 'mp3':
                content_type = 'audio/mpeg'
                file_extension = 'mp3'
            elif download_type == 'wav':
                content_type = 'audio/wav'
                file_extension = 'wav'
            else:
                content_type = 'application/octet-stream'
                file_extension = download_type
            
            response = HttpResponse(file_content, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{beat.name}_{download_type}.{file_extension}"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error reading file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@csrf_exempt
@api_view(['POST'])
@permission_classes([])  # No authentication required for webhooks
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        return HttpResponse(status=400)
    
    # Check if we've already processed this event
    event_id = event['id']
    if StripeWebhookEvent.objects.filter(stripe_event_id=event_id).exists():
        return HttpResponse(status=200)
    
    # Store the event
    webhook_event = StripeWebhookEvent.objects.create(
        stripe_event_id=event_id,
        event_type=event['type']
    )
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent['id']
        
        try:
            # Get metadata from payment intent
            metadata = payment_intent.get('metadata', {})
            user_id = metadata.get('user_id')
            beat_id = metadata.get('beat_id')
            download_type = metadata.get('download_type', 'mp3')
            amount = payment_intent.get('amount', 0) / 100  # Convert from cents
            
            if not user_id or not beat_id:
                logger.error(f"Missing metadata in payment intent {payment_intent_id}")
                return HttpResponse(status=200)  # Return 200 to prevent retry
            
            # Create or update purchase record
            user = User.objects.get(id=int(user_id))
            beat = Beat.objects.get(id=int(beat_id))
            
            purchase, created = Purchase.objects.get_or_create(
                user=user,
                beat=beat,
                download_type=download_type,
                defaults={
                    'price_paid': amount,
                    'payment_method': 'stripe',
                    'payment_status': 'completed',
                    'stripe_payment_intent_id': payment_intent_id,
                }
            )
            
            # If purchase already existed, update it
            if not created:
                purchase.payment_status = 'completed'
                purchase.stripe_payment_intent_id = payment_intent_id
                purchase.save()
            
            logger.info(f"Payment succeeded - {'created' if created else 'updated'} purchase {purchase.id}")
            webhook_event.processed = True
            webhook_event.save()
            
        except User.DoesNotExist:
            logger.error(f"User not found for payment intent {payment_intent_id}")
        except Beat.DoesNotExist:
            logger.error(f"Beat not found for payment intent {payment_intent_id}")
        except Exception as e:
            logger.error(f"Error processing payment success: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent['id']
        
        try:
            # Find the purchase record
            purchase = Purchase.objects.get(stripe_payment_intent_id=payment_intent_id)
            purchase.payment_status = 'failed'
            purchase.save()
            
            logger.info(f"Payment failed for purchase {purchase.id}")
            webhook_event.processed = True
            webhook_event.save()
            
        except Purchase.DoesNotExist:
            logger.error(f"Purchase not found for payment intent {payment_intent_id}")
        except Exception as e:
            logger.error(f"Error processing payment failure: {e}")
    
    return HttpResponse(status=200)


class UserProfileView(APIView):
    """Handle user profile operations"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update current user's profile"""
        return self._update_profile(request)
    
    def patch(self, request):
        """Partially update current user's profile"""
        return self._update_profile(request)
    
    def _update_profile(self, request):
        """Handle profile update with support for nested profile data"""
        # Handle FormData with nested profile fields
        if hasattr(request.data, 'getlist'):
            # This is FormData
            data = {}
            profile_data = {}
            
            for key, value in request.data.items():
                if key.startswith('profile.'):
                    profile_key = key.replace('profile.', '')
                    profile_data[profile_key] = value
                else:
                    data[key] = value
            
            if profile_data:
                data['profile'] = profile_data
                
            print(f"FormData received: {data}")
            print(f"Profile data: {profile_data}")
        else:
            # This is JSON data
            data = request.data
            print(f"JSON data received: {data}")
        
        serializer = UserSerializer(request.user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            print(f"Updated user data: {serializer.data}")
            return Response(serializer.data)
        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserRegistrationView(APIView):
    """Handle user registration"""
    permission_classes = []  # No authentication required for registration
    
    def post(self, request):
        """Register a new user"""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Return user data without password
            user_serializer = UserSerializer(user)
            return Response(user_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
