import { loadStripe, type Appearance } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here',
);

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
