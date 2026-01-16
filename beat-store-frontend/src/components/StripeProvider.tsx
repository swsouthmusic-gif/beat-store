import React, { useMemo } from 'react';
import { loadStripe, type Appearance } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Initialize Stripe
// Use live key in production (when VITE_ENVIRONMENT=production or in production build),
// test key in development
const getStripeKey = () => {
  const isProduction = import.meta.env.PROD || import.meta.env.VITE_ENVIRONMENT === 'production';

  const key = isProduction
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE ||
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error(
      `Missing Stripe publishable key for ${isProduction ? 'production' : 'development'}`,
    );
  }

  // Optional: extra safety
  if (isProduction && key.startsWith('pk_test_')) {
    throw new Error(
      'Production is using a test Stripe publishable key (pk_test_). Fix Vercel env vars.',
    );
  }

  return key;
};

const stripePromise = loadStripe(getStripeKey());

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
  amount?: number; // Amount in cents
  currency?: string;
}

export const StripeProvider = ({ children, clientSecret }: StripeProviderProps) => {
  const appearance: Appearance = {
    theme: 'night',
    labels: 'floating',
  };

  const options = useMemo(() => {
    if (clientSecret) {
      return {
        clientSecret,
        appearance: appearance,
      };
    }
    // Use payment mode with minimal amount when clientSecret not available
    // This allows Elements to initialize and hooks to work
    return {
      mode: 'payment' as const,
      amount: 1,
      currency: 'usd',
      appearance: appearance,
    };
  }, [clientSecret]);

  // Track transition using a ref to prevent re-render loops
  // Only remount Elements once when clientSecret first appears
  const hasTransitionedRef = React.useRef(false);
  const [mountedKey, setMountedKey] = React.useState('payment-mode');

  React.useEffect(() => {
    // Only remount once when clientSecret first appears
    if (clientSecret && !hasTransitionedRef.current) {
      hasTransitionedRef.current = true;
      setMountedKey('payment-intent-mode');
    }
  }, [clientSecret]);

  return (
    <Elements key={mountedKey} stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
