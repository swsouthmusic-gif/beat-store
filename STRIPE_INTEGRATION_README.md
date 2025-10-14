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

1. Update Stripe keys to live keys
2. Set up proper webhook endpoints
3. Configure CORS for production domains
4. Set up proper logging and monitoring
5. Test webhook delivery and processing
6. Implement proper error handling and retry logic

## API Endpoints

- `POST /api/beats/{id}/create_payment_intent/` - Create payment intent
- `POST /api/stripe/webhook/` - Stripe webhook handler
- `GET /api/beats/{id}/download/?type={type}` - Download file (requires completed purchase)
