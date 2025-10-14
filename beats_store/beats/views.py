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
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .models import Beat, Purchase, StripeWebhookEvent, UserProfile
from .serializers import BeatSerializer, PurchaseSerializer, UserSerializer, UserRegistrationSerializer

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)

class BeatViewSet(viewsets.ModelViewSet):
    queryset = Beat.objects.all().order_by('-created_at')
    serializer_class = BeatSerializer
    filterset_fields = ['genre', 'bpm', 'scale']

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:  # allow public access to list and retrieve
            return [IsAuthenticatedOrReadOnly()]
        if self.action in ["download", "purchase", "create_payment_intent", "confirm_payment"]:  # custom actions
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def create_payment_intent(self, request, pk=None):
        """Create a Stripe Payment Intent for the beat purchase"""
        beat = self.get_object()
        download_type = request.data.get('download_type')
        price_paid = request.data.get('price_paid')
        
        if not download_type or not price_paid:
            return Response(
                {'error': 'download_type and price_paid are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate download type
        valid_types = ['mp3', 'wav', 'stems']
        if download_type not in valid_types:
            return Response(
                {'error': f'download_type must be one of {valid_types}'}, 
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
        
        # Check if user has a pending purchase for this beat/download type
        pending_purchase = Purchase.objects.filter(
            user=request.user,
            beat=beat,
            download_type=download_type,
            payment_status='pending'
        ).first()
        
        if pending_purchase:
            # Return the existing payment intent
            try:
                intent = stripe.PaymentIntent.retrieve(pending_purchase.stripe_payment_intent_id)
                return Response({
                    'client_secret': intent.client_secret,
                    'payment_intent_id': intent.id,
                    'purchase_id': pending_purchase.id
                })
            except stripe.error.StripeError as e:
                logger.error(f"Error retrieving existing payment intent: {str(e)}")
                # If we can't retrieve the existing intent, delete the pending purchase and create a new one
                pending_purchase.delete()
        
        try:
            # Create Stripe Payment Intent
            intent = stripe.PaymentIntent.create(
                amount=int(float(price_paid) * 100),  # Convert to cents
                currency='usd',
                metadata={
                    'user_id': request.user.id,
                    'beat_id': beat.id,
                    'download_type': download_type,
                    'beat_name': beat.name,
                },
                automatic_payment_methods={
                    'enabled': True,
                },
            )
            
            # Create pending purchase record
            purchase = Purchase.objects.create(
                user=request.user,
                beat=beat,
                download_type=download_type,
                price_paid=price_paid,
                payment_method='stripe',
                payment_status='pending',
                stripe_payment_intent_id=intent.id
            )
            
            return Response({
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'purchase_id': purchase.id
            })
            
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
        """Confirm payment completion for a purchase"""
        beat = self.get_object()
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response(
                {'error': 'payment_intent_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find the purchase record
            purchase = Purchase.objects.get(
                user=request.user,
                beat=beat,
                stripe_payment_intent_id=payment_intent_id
            )
            
            # Update payment status to completed
            purchase.payment_status = 'completed'
            purchase.save()
            
            logger.info(f"Payment manually confirmed for purchase {purchase.id}")
            
            return Response({
                'message': 'Payment confirmed successfully',
                'purchase_id': purchase.id,
                'download_type': purchase.download_type
            })
            
        except Purchase.DoesNotExist:
            return Response(
                {'error': 'Purchase not found for this payment intent'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error confirming payment: {e}")
            return Response(
                {'error': f'Error confirming payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
            # Find the purchase record
            purchase = Purchase.objects.get(stripe_payment_intent_id=payment_intent_id)
            purchase.payment_status = 'completed'
            purchase.save()
            
            logger.info(f"Payment succeeded for purchase {purchase.id}")
            webhook_event.processed = True
            webhook_event.save()
            
        except Purchase.DoesNotExist:
            logger.error(f"Purchase not found for payment intent {payment_intent_id}")
        except Exception as e:
            logger.error(f"Error processing payment success: {e}")
    
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
