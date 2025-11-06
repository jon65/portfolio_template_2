# Stripe Integration Setup Guide for Next.js

This Next.js app includes Stripe payment integration with server-side API routes. Follow these steps to set it up:

## 1. Get Your Stripe API Keys

1. Sign up for a Stripe account at https://stripe.com
2. Go to https://dashboard.stripe.com/test/apikeys
3. Copy both:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

## 2. Install Dependencies

```bash
npm install
```

This will install:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe.js
- `@stripe/react-stripe-js` - React components for Stripe

## 3. Configure Environment Variables

1. Create a `.env.local` file in the root directory:

```bash
# Publishable Key (Client-side - exposed to browser)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Secret Key (Server-side only - NEVER expose to browser)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Webhook Secret (Optional - for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Important Notes:**
- In Next.js, environment variables exposed to the browser must use the `NEXT_PUBLIC_` prefix
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The secret key is only used in API routes (`app/api/`)

## 4. API Routes

The app includes two Next.js API routes:

### `/api/create-payment-intent` (POST)
- Creates a Stripe payment intent server-side
- Used by the checkout form
- Located at: `app/api/create-payment-intent/route.js`

### `/api/webhook` (POST)
- Handles Stripe webhook events
- For production: Configure in Stripe Dashboard
- Located at: `app/api/webhook/route.js`

## 5. How It Works

1. **Client Side** (`app/components/Checkout.jsx`):
   - User fills out shipping and payment forms
   - Stripe Elements handles card input securely
   - Calls `/api/create-payment-intent` to create payment intent

2. **Server Side** (`app/api/create-payment-intent/route.js`):
   - Receives payment request
   - Creates payment intent using Stripe SDK
   - Returns client secret to frontend

3. **Payment Confirmation**:
   - Frontend confirms payment with Stripe
   - On success, redirects to `/success` page

## 6. Testing Payments

Use Stripe's test card numbers:
- **Card:** 4242 4242 4242 4242
- **Expiry:** Any future date (e.g., 12/34)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

## 7. Email Invoices (Automatic)

The app automatically sends invoice emails to customers after successful payments:

1. **Setup Resend** (see `EMAIL_SETUP.md` for details):
   - Sign up at https://resend.com
   - Get API key
   - Add to `.env.local`:
     ```env
     RESEND_API_KEY=re_your_key_here
     RESEND_FROM_EMAIL=Your Brand <noreply@yourdomain.com>
     ```

2. **How it works:**
   - Payment succeeds → Webhook triggered
   - Invoice email automatically sent to customer
   - Email includes order details, items, and shipping info

3. **Customize:**
   - Edit email template in `app/lib/email.js`
   - Update brand name and styling
   - See `EMAIL_SETUP.md` for full details

## 8. Webhook Setup (Required for Email Invoices)

For production, set up webhooks to handle payment events:

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret to `.env.local`

## 8. Production Deployment

Before going live:

1. **Switch to Live Keys:**
   - Get live keys from Stripe Dashboard
   - Update `.env.local` with live keys:
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
     - `STRIPE_SECRET_KEY=sk_live_...`

2. **Set Environment Variables:**
   - In your hosting platform (Vercel, Netlify, etc.)
   - Add the same environment variables
   - Never commit live keys to git

3. **Test Complete Flow:**
   - Test with real card (use small amount)
   - Verify webhooks are working
   - Check order confirmations

4. **Security Checklist:**
   - ✅ Secret key only in server-side code
   - ✅ Environment variables set in hosting platform
   - ✅ Webhook signature verification enabled
   - ✅ HTTPS enabled (required for Stripe)

## 9. File Structure

```
app/
├── api/
│   ├── create-payment-intent/
│   │   └── route.js          # Creates payment intents
│   └── webhook/
│       └── route.js          # Handles webhook events
├── components/
│   └── Checkout.jsx          # Checkout form with Stripe Elements
└── checkout/
    └── page.jsx              # Checkout page
```

## 10. Troubleshooting

**Error: "Invalid API Key"**
- Check that `STRIPE_SECRET_KEY` is set correctly
- Ensure you're using test keys for testing

**Error: "Stripe publishable key not found"**
- Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Restart dev server after adding env variables

**Webhook errors:**
- Ensure webhook URL is correct
- Check webhook secret matches Stripe Dashboard
- Verify HTTPS is enabled (required for webhooks)

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Stripe Elements](https://stripe.com/docs/stripe-js/react)
- [Stripe Testing](https://stripe.com/docs/testing)
