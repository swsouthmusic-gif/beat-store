# Stripe Integration for Beat Store

This document outlines the Stripe payment integration that has been added to the Beat Store application.

## Overview

The integration includes:

- Stripe Payment Intents for secure payment processing
- Webhook handling for payment status updates
- Frontend Stripe Elements for payment forms
- Database models for tracking payments and webhook events

## Backend Changes

### Models Updated (`beats/models.py`)

- Added `StripeWebhookEvent` model to track webhook events
- Enhanced `Purchase` model with:
  - `payment_status` field (pending, processing, completed, failed, cancelled)
  - `stripe_payment_intent_id` field
  - `stripe_session_id` field
  - `updated_at` field

### Views Updated (`beats/views.py`)

- Added `create_payment_intent` action to create Stripe Payment Intents
- Added `stripe_webhook` function to handle Stripe webhook events
- Updated `download` action to check for completed purchases only

### URLs Updated (`beats/urls.py`)

- Added webhook endpoint: `/api/stripe/webhook/`

### Settings Updated (`beats_store/settings.py`)

- Added Stripe configuration variables
- Updated to use `python-decouple` for environment variables

## Frontend Changes

### New Components

- `StripeProvider.tsx` - Provides Stripe context
- `StripePaymentForm.tsx` - Handles payment form with Stripe Elements

### Updated Components

- `CheckoutStep.tsx` - Integrated Stripe payment flow
- `beatApi.ts` - Added `createPaymentIntent` mutation

## Environment Variables

### Backend (.env file in project root)

```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Frontend (.env file in beat-store-frontend/)

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Setup Instructions

### 1. Install Dependencies

Backend:

```bash
cd /path/to/beat-store
source env/bin/activate
pip install -r requirements.txt
```

Frontend:

```bash
cd beat-store-frontend
npm install
```

### 2. Database Migration

```bash
cd beats_store
python manage.py migrate
```

### 3. Stripe Configuration

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints:
   - URL: `https://yourdomain.com/api/stripe/webhook/`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Update environment variables with your Stripe keys

### 4. Run the Application

Backend:

```bash
cd beats_store
python manage.py runserver
```

Frontend:

```bash
cd beat-store-frontend
npm run dev
```

## Payment Flow

1. User selects a beat and download type
2. Frontend calls `create_payment_intent` API
3. Stripe Payment Intent is created and returned
4. User completes payment using Stripe Elements
5. Stripe sends webhook to update payment status
6. User can download the file after successful payment

## Security Features

- Payment Intents for secure payment processing
- Webhook signature verification
- Duplicate webhook event prevention
- Payment status tracking
- File access restricted to completed purchases

## Testing

### Authentication

A test user has been created for testing:

- Username: `testuser`
- Password: `testpass123`
- Email: `test@example.com`

### Stripe Test Cards

- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires authentication: 4000 0025 0000 3155

## Production Considerations

### Setting Up Live Stripe Keys for Production

The application is configured to automatically use **live Stripe keys in production** and **test keys in development**.

#### Backend Configuration

In your production environment (Railway, Heroku, etc.), set these environment variables:

```env
DEBUG=False
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_your_live_publishable_key_here
STRIPE_SECRET_KEY_LIVE=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET_LIVE=whsec_your_live_webhook_secret_here
```

**Note:** The backend will automatically use these `*_LIVE` keys when `DEBUG=False`. If `*_LIVE` keys are not provided, it will fall back to the regular `STRIPE_*` keys.

#### Frontend Configuration

In your production frontend deployment (Vercel, Netlify, etc.), set:

```env
VITE_ENVIRONMENT=production
VITE_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_your_live_publishable_key_here
```

**Important Notes:**

1. **Vite embeds environment variables at build time** - You MUST set these variables in Vercel BEFORE deploying/rebuilding
2. **Variable names must start with `VITE_`** - Only variables prefixed with `VITE_` are exposed to the client
3. **After adding env vars, trigger a new deployment** - Go to Vercel dashboard → Your Project → Settings → Environment Variables, add the variables, then redeploy
4. The frontend will use the live key when `VITE_ENVIRONMENT=production` or when building for production (`npm run build`)

**Vercel Setup Steps:**

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` with your live publishable key (starts with `pk_live_`)
4. Add `VITE_ENVIRONMENT` with value `production`
5. **Important:** After adding variables, go to Deployments tab and click "Redeploy" on the latest deployment, or push a new commit to trigger a rebuild

#### Development Environment

For local development, continue using test keys:

**Backend (.env):**

```env
DEBUG=True
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here
```

**Frontend (.env):**

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
```

### Other Production Considerations

1. Set up proper webhook endpoints in Stripe Dashboard:
   - Production webhook URL: `https://yourdomain.com/api/stripe/webhook/`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
2. Configure CORS for production domains
3. Set up proper logging and monitoring
4. Test webhook delivery and processing
5. Implement proper error handling and retry logic

## API Endpoints

- `POST /api/beats/{id}/create_payment_intent/` - Create payment intent
- `POST /api/stripe/webhook/` - Stripe webhook handler
- `GET /api/beats/{id}/download/?type={type}` - Download file (requires completed purchase)
