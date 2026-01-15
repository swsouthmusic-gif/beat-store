import React, { useState } from 'react';
import {
  Box,
  Button,
  Alert,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCreatePaymentIntentMutation, useConfirmPaymentMutation } from '@/store/beatApi';
import type { BeatType } from '@/store/beatApi';
import { CheckCircle, Security } from '@mui/icons-material';

interface StripePaymentFormProps {
  beat: BeatType;
  selectedDownloadType: 'mp3' | 'wav' | 'stems';
  selectedLicense: {
    type: 'mp3' | 'wav' | 'stems';
    label: string;
    color: string;
    includes: string[];
    price: number | string | null | undefined;
  };
  onPaymentSuccess: (downloadUrl: string) => void;
  onPaymentError: (error: string) => void;
  onClientSecretChange?: (clientSecret: string | null) => void;
  clientSecret?: string | null;
  shouldCreateIntent?: boolean; // Prevent auto-creation if false
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  beat,
  selectedDownloadType,
  selectedLicense,
  onPaymentSuccess,
  onPaymentError,
  onClientSecretChange,
  clientSecret,
  shouldCreateIntent = true,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [createPaymentIntent, { isLoading: isCreatingIntent }] = useCreatePaymentIntentMutation();
  const [confirmPayment] = useConfirmPaymentMutation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle',
  );
  const [hasConfirmedPayment, setHasConfirmedPayment] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const hasAttemptedCreation = React.useRef(false);
  const creationKeyRef = React.useRef<string>('');

  // Create a stable key to track when we should reset the creation attempt
  const currentKey = `${beat.id}-${selectedDownloadType}-${selectedLicense.price}`;

  // Reset creation attempt if the key changes (beat, download type, or price changed)
  React.useEffect(() => {
    if (creationKeyRef.current !== currentKey) {
      hasAttemptedCreation.current = false;
      creationKeyRef.current = currentKey;
      // Also reset clientSecret when key changes to allow new payment intent creation
      if (clientSecret) {
        onClientSecretChange?.(null);
      }
    }
  }, [currentKey, clientSecret, onClientSecretChange]);

  // Auto-create payment intent when component mounts (only if shouldCreateIntent is true)
  React.useEffect(() => {
    // Only attempt if we haven't already attempted and all conditions are met
    if (
      shouldCreateIntent !== true ||
      clientSecret ||
      isCreatingIntent ||
      hasAttemptedCreation.current
    ) {
      return; // Exit early if conditions aren't met
    }

    // Add a small delay to ensure purchase check has completed
    const timeoutId = setTimeout(async () => {
      // Double-check conditions after delay (they might have changed)
      if (
        shouldCreateIntent === true &&
        !clientSecret &&
        !isCreatingIntent &&
        !hasAttemptedCreation.current
      ) {
        try {
          hasAttemptedCreation.current = true;
          setPaymentStatus('processing');
          setError(null);

          const result = await createPaymentIntent({
            beatId: beat.id,
            downloadType: selectedDownloadType,
            pricePaid: parseFloat(selectedLicense.price?.toString() || '0'),
          }).unwrap();

          setPaymentIntentId(result.payment_intent_id);
          onClientSecretChange?.(result.client_secret);
        } catch (err: any) {
          hasAttemptedCreation.current = false; // Reset on error so user can retry
          const errorMessage = err?.data?.error || err?.error || 'Failed to create payment intent';

          // Check if error is about already purchased
          if (
            errorMessage.toLowerCase().includes('already purchased') ||
            errorMessage.toLowerCase().includes('already have this purchase')
          ) {
            // Don't show error, let the parent component handle it via the purchase check
            setPaymentStatus('error');
            onPaymentError('already_purchased');
            return;
          }

          setError(errorMessage);
          setPaymentStatus('error');
          onPaymentError(errorMessage);
        }
      }
    }, 100); // Small delay to ensure purchase check completes

    return () => clearTimeout(timeoutId);
  }, [
    clientSecret,
    isCreatingIntent,
    shouldCreateIntent,
    currentKey,
    beat.id,
    selectedDownloadType,
    selectedLicense.price,
    createPaymentIntent,
    onClientSecretChange,
    onPaymentError,
  ]);

  // Reset payment state when clientSecret changes
  React.useEffect(() => {
    if (clientSecret) {
      setHasConfirmedPayment(false);
      setPaymentStatus('idle');
      setError(null);
    }
  }, [clientSecret]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Prevent duplicate payment confirmations
    if (hasConfirmedPayment) {
      setError(
        'Payment has already been processed. Please refresh the page to start a new payment.',
      );
      return;
    }

    // Ensure we have a clientSecret before proceeding
    if (!clientSecret) {
      setError('Payment form is not ready. Please wait...');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setIsProcessing(false);
        setError(submitError.message || 'Please check your payment details.');
        onPaymentError?.(submitError.message || 'Validation failed');
        return;
      }

      // Mark that we're about to confirm payment
      setHasConfirmedPayment(true);

      // Confirm payment with the existing clientSecret
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/beats`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        // Handle specific Stripe errors
        if (stripeError.code === 'payment_intent_unexpected_state') {
          setError(
            'This payment has already been processed. Please refresh the page to start a new payment.',
          );
          setHasConfirmedPayment(true); // Keep this true to prevent further attempts
        } else {
          // Reset confirmation state on other errors so user can retry
          setHasConfirmedPayment(false);
          setError(stripeError.message || 'Payment failed');
        }
        onPaymentError(stripeError.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded - confirm it on the backend
        try {
          await confirmPayment({
            beatId: beat.id,
            paymentIntentId: paymentIntentId || paymentIntent.id,
          }).unwrap();

          setPaymentStatus('success');
          const downloadUrl = `/api/beats/${beat.id}/download/?type=${selectedDownloadType}`;

          // Trigger download automatically
          setTimeout(() => {
            onPaymentSuccess(downloadUrl);
          }, 2000); // Give user time to see success message
        } catch (confirmError: any) {
          console.error('Failed to confirm payment:', confirmError);
          setError('Payment succeeded but confirmation failed. Please contact support.');
          onPaymentError('Payment confirmation failed');
        }
      }
    } catch (err: any) {
      // Reset confirmation state on error so user can retry
      setHasConfirmedPayment(false);
      const errorMessage = err?.data?.error || 'Payment failed. Please try again.';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Success state
  if (paymentStatus === 'success') {
    return (
      <Card sx={{ maxWidth: 500, mx: 'auto', textAlign: 'center', p: 4 }}>
        <CardContent>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Payment Successful! 🎉
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Your {selectedDownloadType.toUpperCase()} download is being prepared...
          </Typography>
          <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Download will start automatically in a moment
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Loading state while creating payment intent
  if (!clientSecret || clientSecret.trim() === '') {
    return (
      <Card sx={{ maxWidth: 500, mx: 'auto' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Preparing Payment...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Setting up your secure payment form
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Payment form
  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit}>
        {clientSecret && clientSecret.trim() !== '' && (
          <Box sx={{ mb: 3 }}>
            <PaymentElement
              options={{
                layout: 'tabs',
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: {
                      country: 'auto',
                      line1: 'auto',
                      line2: 'auto',
                      city: 'auto',
                      state: 'auto',
                      postalCode: 'auto',
                    },
                  },
                },
              }}
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={
            !stripe ||
            !clientSecret ||
            clientSecret.trim() === '' ||
            isProcessing ||
            hasConfirmedPayment
          }
          fullWidth
          size="large"
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            color: '#fff',
            py: 1.5,
            background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1aa34a 0%, #1db954 100%)',
            },
            '&:disabled': {
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          {isProcessing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Processing Payment...
            </Box>
          ) : hasConfirmedPayment ? (
            'Payment Processed'
          ) : (
            `Complete Payment - $${selectedLicense.price}`
          )}
        </Button>

        <Box
          sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
        >
          <Security sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Your payment information is encrypted and secure
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default StripePaymentForm;
