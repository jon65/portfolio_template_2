# Complete Environment Variables Reference

Copy this template to create your `.env.local` file:

```env
# ============================================
# Database Configuration (Supabase/PostgreSQL)
# ============================================
# Prisma will automatically use this connection string
# Get your connection string from Supabase Dashboard > Settings > Database > Connection String
# Use the "Connection pooling" connection string for serverless environments

# Supabase Database URL (PostgreSQL)
# Format: postgresql://[user]:[password]@[host]:[port]/[database]?[params]
# For Supabase, use the connection pooling URL:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

# ============================================
# Stripe Configuration
# ============================================
# Get keys from: https://dashboard.stripe.com/test/apikeys

# Publishable Key (Client-side - exposed to browser)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Secret Key (Server-side only - NEVER expose to browser)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Webhook Secret (Get from Stripe Dashboard > Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# ============================================
# Email Configuration (Resend)
# ============================================
# Get API key from: https://resend.com/api-keys
# Sign up at: https://resend.com

# Resend API Key
RESEND_API_KEY=re_your_resend_api_key_here

# From Email Address
# Format: "Display Name <email@domain.com>"
# For development, use: "Your Brand <onboarding@resend.dev>"
# For production, use your verified domain
RESEND_FROM_EMAIL=Your Brand <noreply@yourdomain.com>

# ============================================
# Admin Notification
# ============================================
# Email address to receive order notifications
# Admin will receive an email notification when a payment succeeds
ADMIN_EMAIL=admin@yourdomain.com

# ============================================
# Admin Panel Configuration
# ============================================
# Configure how orders are sent to your admin panel

# Option 1: External Admin Panel API (Recommended for separate admin system)
# If you have an external admin panel, provide its API endpoint
ADMIN_PANEL_API_URL=https://your-admin-panel.com/api/orders

# API Key for external admin panel (optional, but recommended)
ADMIN_PANEL_API_KEY=your_admin_panel_api_key_here

# Option 2: Internal Storage (Used if ADMIN_PANEL_API_URL is not set)
# Orders will be stored internally and can be retrieved via /api/admin/orders
# In production, replace in-memory storage with a database

# Internal API Key (optional, for securing internal API calls)
INTERNAL_API_KEY=your_internal_api_key_here

# Admin API Key (for retrieving orders via GET /api/admin/orders)
ADMIN_API_KEY=your_admin_api_key_here

# App URL (for internal API calls, auto-detected on Vercel)
NEXT_PUBLIC_APP_URL=https://your-app.com

# ============================================
# Order Storage Configuration
# ============================================
# Configure where to store orders after successful payment
# Options: 's3', 'database', or 'internal' (default)

# Storage type (s3, database, or internal)
ORDER_STORAGE_TYPE=internal

# Client-side storage type (must match server-side)
NEXT_PUBLIC_ORDER_STORAGE_TYPE=internal

# Option 1: AWS S3 Configuration
# Required if ORDER_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1

# Option 2: Database API Configuration
# Required if ORDER_STORAGE_TYPE=database
DATABASE_API_URL=https://your-database-api.com/orders
DATABASE_API_KEY=your_database_api_key

# ============================================
# Test Mode Configuration (Development Only)
# ============================================
# Enable test mode to simulate Stripe payments without making actual API calls
# Set to 'true' to enable test mode, 'false' or leave unset for production
# When enabled:
#   - No actual Stripe API calls will be made
#   - Payments will be simulated and always succeed
#   - Webhooks will be simulated locally
#   - Admin notifications will be marked as TEST MODE
#   - Useful for development and testing without Stripe setup

# Server-side test mode flag
STRIPE_TEST_MODE=false

# Client-side test mode flag (must match server-side for consistency)
NEXT_PUBLIC_STRIPE_TEST_MODE=false
```

## Quick Setup Checklist

- [ ] Supabase project created
- [ ] Database connection string obtained
- [ ] Prisma schema migrated to database
- [ ] Stripe account created
- [ ] Stripe test keys obtained
- [ ] Resend account created (for emails)
- [ ] Resend API key obtained
- [ ] `.env.local` file created with all variables
- [ ] Admin email configured (ADMIN_EMAIL)
- [ ] Webhook configured in Stripe Dashboard (production only)
- [ ] Domain verified in Resend (for production)

## Testing

### Option 1: Test Mode (Recommended for Development)

Test mode allows you to test the payment flow without setting up Stripe:

1. Set `STRIPE_TEST_MODE=true` and `NEXT_PUBLIC_STRIPE_TEST_MODE=true` in `.env.local`
2. Set `ADMIN_EMAIL` to your email address
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start development server
5. Complete a test payment (no card required, payment always succeeds)
6. Check your email for:
   - Customer invoice email
   - Admin notification email (marked as TEST MODE)

### Option 2: Real Stripe Testing

For testing with actual Stripe:

1. Set `STRIPE_TEST_MODE=false` (or leave unset)
2. Configure all Stripe keys (test keys)
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start development server
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete a test payment
7. Check Resend Dashboard to see sent emails
8. Verify customer receives invoice email
9. Verify admin receives notification email

See `STRIPE_SETUP.md` and `EMAIL_SETUP.md` for detailed instructions.

