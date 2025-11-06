# Email Invoice Setup Guide

This app includes automatic invoice email functionality that sends order confirmations to customers after successful Stripe payments.

## Email Service: Resend

We're using [Resend](https://resend.com) for sending emails. It's modern, reliable, and works great with Next.js.

### Alternative Email Services

If you prefer a different service, you can modify `app/lib/email.js`:
- **SendGrid** - Popular email service
- **Mailgun** - Developer-friendly email API
- **AWS SES** - Amazon's email service
- **Nodemailer** - For SMTP servers (Gmail, Outlook, etc.)

## Setup Instructions

### 1. Sign Up for Resend

1. Go to https://resend.com
2. Sign up for a free account (100 emails/day free)
3. Verify your domain (or use their test domain for development)

### 2. Get Your API Key

1. Go to https://resend.com/api-keys
2. Create a new API key
3. Copy the key (starts with `re_`)

### 3. Configure Environment Variables

Add to your `.env.local` file:

```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Your Brand <noreply@yourdomain.com>
```

**Note:** For development, you can use Resend's test domain:
```env
RESEND_FROM_EMAIL=Your Brand <onboarding@resend.dev>
```

### 4. Verify Domain (Production Only)

For production:
1. Go to Resend Dashboard > Domains
2. Add your domain
3. Add the DNS records they provide
4. Wait for verification
5. Update `RESEND_FROM_EMAIL` to use your domain

## How It Works

1. **Customer completes payment** → Stripe processes payment
2. **Stripe sends webhook** → `/api/webhook` receives `payment_intent.succeeded` event
3. **Webhook handler** → Extracts order data from payment intent metadata
4. **Email sent** → Invoice email sent to customer's email address
5. **Customer receives** → Beautiful HTML invoice with order details

## Email Template

The invoice email includes:
- ✅ Order confirmation message
- ✅ Order ID and date
- ✅ Customer information
- ✅ Complete item list with quantities
- ✅ Subtotal, shipping, and total
- ✅ Shipping address
- ✅ Professional branding

## Customization

### Update Email Template

Edit `app/lib/email.js` → `generateInvoiceEmail()` function to customize:
- Colors and styling
- Brand name
- Email content
- Layout

### Update Brand Name

Replace "Your Brand" in:
- `app/lib/email.js` (email template)
- `RESEND_FROM_EMAIL` environment variable

### Change Email Subject

Edit line in `app/lib/email.js`:
```javascript
subject: `Order Confirmation #${paymentIntent.id.slice(-8)}`,
```

## Testing

### Test Mode

1. Use Stripe test mode
2. Complete a test payment
3. Check Resend Dashboard > Emails to see sent emails
4. Check customer's inbox (if using real email)

### Test Card

Use Stripe test card: `4242 4242 4242 4242`

## Troubleshooting

**Email not sending:**
- Check `RESEND_API_KEY` is set correctly
- Verify `RESEND_FROM_EMAIL` format: `Name <email@domain.com>`
- Check Resend Dashboard for errors
- Check server logs for error messages

**Webhook not triggering:**
- Ensure webhook is configured in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check webhook URL is correct: `https://yourdomain.com/api/webhook`

**Email format issues:**
- Check HTML template in `generateInvoiceEmail()`
- Test email rendering in different email clients
- Use Resend's email preview feature

## Production Checklist

- [ ] Domain verified in Resend
- [ ] `RESEND_FROM_EMAIL` uses your domain
- [ ] `RESEND_API_KEY` is set in production environment
- [ ] Test email sending with real payment
- [ ] Verify emails are delivered
- [ ] Check spam folder (if emails not received)
- [ ] Set up email monitoring/alerts

## Email Limits

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month

**Resend Pro:**
- $20/month
- 50,000 emails/month
- Custom domain support

## Additional Features You Can Add

- Order tracking updates via email
- Shipping notifications
- Abandoned cart emails
- Order cancellation emails
- Refund confirmation emails

See `app/lib/email.js` for the email sending logic and template.



