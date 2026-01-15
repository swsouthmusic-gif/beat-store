import { useMemo } from 'react';
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
    const errorMessage = isProduction
      ? `Missing Stripe publishable key for production. 
      
IMPORTANT: Vite embeds environment variables at BUILD TIME.

To fix this:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: VITE_STRIPE_PUBLISHABLE_KEY_LIVE = pk_live_your_live_key_here
3. Add: VITE_ENVIRONMENT = production
4. Go to Deployments tab and click "Redeploy" (or push a new commit)

The app must be rebuilt after adding environment variables.`
      : `Missing Stripe publishable key for development. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.`;
    throw new Error(errorMessage);
  }

  // Safety check: Warn if production is using test key
  if (isProduction && key.startsWith('pk_test_')) {
    throw new Error(
      `Production is using a test Stripe publishable key (pk_test_). 

To fix:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Set VITE_STRIPE_PUBLISHABLE_KEY_LIVE to your live key (pk_live_...)
3. Redeploy the application`,
    );
  }

  return key;
};

// Lazy load Stripe to avoid errors at module load time
let stripePromise: Promise<any> | null = null;
const getStripePromise = () => {
  if (!stripePromise) {
    try {
      stripePromise = loadStripe(getStripeKey());
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export const StripeProvider = ({ children, clientSecret }: StripeProviderProps) => {
  // Only render Elements when clientSecret exists
  // This follows best practice: wait for PaymentIntent creation before mounting Elements
  if (!clientSecret) {
    return null; // Show a loader / skeleton instead (handled by parent component)
  }

  // Memoize the Stripe promise to avoid recreating it on every render
  const stripePromise = useMemo(() => {
    try {
      return getStripePromise();
    } catch (error) {
      console.error('Stripe initialization error:', error);
      throw error;
    }
  }, []);

  const appearance: Appearance = {
    theme: 'night',
    labels: 'floating',
  };

  const options = useMemo(
    () => ({
      clientSecret,
      appearance: appearance,
    }),
    [clientSecret],
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
