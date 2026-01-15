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

export const StripeProvider = ({
  children,
  clientSecret,
  amount,
  currency = 'usd',
}: StripeProviderProps) => {
  const appearance: Appearance = {
    theme: 'night',
    labels: 'floating',
  };

  const options = clientSecret
    ? {
        clientSecret,
        appearance: appearance,
      }
    : {
        mode: 'payment' as const,
        amount: amount ? Math.round(amount * 100) : 0,
        currency,
        appearance: appearance,
      };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
