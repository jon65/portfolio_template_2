# Test Mode Guide

This guide explains how to use the Stripe Test Mode feature for development and testing.

## Overview

Test Mode allows you to simulate Stripe payments without making actual API calls to Stripe. This is perfect for:
- Development without Stripe account setup
- Testing payment flows locally
- CI/CD pipelines
- Demo environments

## How It Works

When Test Mode is enabled:
1. **Payment Intent Creation**: Returns a mock payment intent instead of calling Stripe API
2. **Payment Confirmation**: Simulates successful payment without card validation
3. **Webhook Simulation**: Automatically triggers webhook locally with mock data
4. **Email Notifications**: Both customer and admin emails are sent, marked as TEST MODE

## Setup

### 1. Enable Test Mode

Add these variables to your `.env.local` file:

```env
# Enable test mode
STRIPE_TEST_MODE=true
NEXT_PUBLIC_STRIPE_TEST_MODE=true

# Configure admin email for notifications
ADMIN_EMAIL=your-email@example.com

# Email service (still required for notifications)
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=Your Brand <onboarding@resend.dev>
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Payment Flow

1. Add items to cart
2. Go to checkout
3. Fill in shipping information
4. Click "Pay" (no card required in test mode)
5. Payment will be simulated and always succeed
6. Check your email for notifications

## What Happens in Test Mode

### Payment Intent Creation (`/api/create-payment-intent`)
- Returns mock payment intent with test ID
- No Stripe API call is made
- Console logs: `⚠️  [TEST MODE] Creating mock payment intent`

### Payment Confirmation (Checkout Component)
- Skips Stripe card element
- Simulates successful payment
- Automatically triggers webhook simulation
- Console logs: `⚠️  [TEST MODE] Simulating successful payment`

### Webhook Processing (`/api/webhook`)
- Accepts test mode webhooks without signature verification
- Processes payment_intent.succeeded event
- Sends customer invoice email
- Sends admin notification email (marked as TEST MODE)

### Email Notifications
- **Customer Email**: Invoice email sent normally
- **Admin Email**: Notification email with orange TEST MODE banner
- Both emails clearly indicate test mode in subject and content

## Disabling Test Mode

To use real Stripe:

1. Set test mode to false or remove the variables:
```env
STRIPE_TEST_MODE=false
NEXT_PUBLIC_STRIPE_TEST_MODE=false
```

2. Configure real Stripe keys:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Restart your development server

## Test Mode Indicators

### In the UI
- Checkout page shows: "⚠️ TEST MODE ENABLED" banner
- Payment button shows: "[TEST] Pay $X.XX"
- Card input is disabled (shows placeholder)

### In Console Logs
- `⚠️  STRIPE TEST MODE ENABLED`
- `⚠️  [TEST MODE] Creating mock payment intent`
- `⚠️  [TEST MODE] Simulating successful payment`
- `[TEST MODE] Payment succeeded: pi_test_...`

### In Emails
- Admin notification subject: `[TEST MODE] New Order #...`
- Admin email has orange banner: "⚠️ TEST MODE - This is a test order"

## Troubleshooting

### Test Mode Not Working
- Ensure both `STRIPE_TEST_MODE` and `NEXT_PUBLIC_STRIPE_TEST_MODE` are set to `'true'`
- Restart your development server after changing environment variables
- Check browser console for test mode indicators

### Admin Email Not Received
- Verify `ADMIN_EMAIL` is set in `.env.local`
- Check Resend API key is configured
- Check server console for email errors
- Verify email isn't in spam folder

### Webhook Not Triggering
- In test mode, webhook is automatically simulated
- Check server console for webhook logs
- Verify payment intent metadata includes `test_mode: 'true'`

## Production Considerations

⚠️ **IMPORTANT**: Never enable test mode in production!

- Test mode bypasses all payment security
- Always set `STRIPE_TEST_MODE=false` in production
- Use environment-specific configuration files
- Consider using separate environment variables for production

## Code Structure

Test mode functionality is implemented in:
- `app/lib/stripe-test-mode.js` - Test mode utilities
- `app/api/create-payment-intent/route.js` - Payment intent creation
- `app/api/webhook/route.js` - Webhook processing
- `app/components/Checkout.jsx` - Checkout UI and payment flow
- `app/lib/email.js` - Email notifications with test mode support

## Example Test Payment Intent

```javascript
{
  id: "pi_test_1234567890_abc123",
  amount: 5000, // $50.00 in cents
  currency: "usd",
  status: "succeeded",
  metadata: {
    shipping: '{"firstName":"John","lastName":"Doe",...}',
    items: '[{"name":"Product","price":"$50",...}]',
    test_mode: "true"
  }
}
```

