# Troubleshooting Test Mode

If you're getting Stripe API errors in test mode, follow these steps:

## 1. Verify Environment Variables

Make sure your `.env.local` file has:

```env
STRIPE_TEST_MODE=true
NEXT_PUBLIC_STRIPE_TEST_MODE=true
```

**Important:** 
- Values must be exactly `'true'` (string), not `true` (boolean)
- Both variables should be set
- Restart your dev server after changing `.env.local`

## 2. Check Server Logs

When you make a payment request, you should see:

```
🔍 Test mode check: {
  STRIPE_TEST_MODE: 'true',
  NEXT_PUBLIC_STRIPE_TEST_MODE: 'true',
  isTestModeEnabled: true
}
⚠️  [TEST MODE] Creating mock payment intent
```

If you see `isTestModeEnabled: false`, test mode is not being detected.

## 3. Common Issues

### Issue: Environment variable not set correctly
**Solution:** Check `.env.local` file:
- No quotes around `true`
- No spaces: `STRIPE_TEST_MODE=true` (not `STRIPE_TEST_MODE = true`)
- File is in project root (same level as `package.json`)

### Issue: Dev server not restarted
**Solution:** 
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Issue: Multiple .env files
**Solution:** Check for conflicting files:
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`

Use `.env.local` for local development.

### Issue: Next.js caching
**Solution:** Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

## 4. Verify Test Mode is Working

After setting environment variables and restarting:

1. Make a payment request
2. Check console logs - you should see `⚠️  [TEST MODE]` messages
3. No Stripe API calls should be made
4. Payment should succeed without a real card

## 5. Quick Test

Add this to your `.env.local` and restart:

```env
STRIPE_TEST_MODE=true
NEXT_PUBLIC_STRIPE_TEST_MODE=true
```

Then check the server logs when making a payment. You should see test mode messages, not Stripe API errors.

