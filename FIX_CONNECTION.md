# Quick Fix: Database Connection Issue

## Problem
Your `DATABASE_URL` is using the **direct connection** format which isn't IPv4 compatible:
```
postgresql://postgres:[PASSWORD]@db.jwlqmbxxnetwewyrvzpx.supabase.co:5432/postgres
```

## Solution: Use Connection Pooler

### Step 1: Get Pooler URL from Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (`jwlqmbxxnetwewyrvzpx`)
3. Navigate to **Settings** → **Database**
4. Scroll to **"Connection String"** section
5. Change the **"Method"** dropdown from **"Direct connection"** to:
   - **"Session"** (recommended for Next.js/Prisma)
   - OR **"Transaction"**
6. Copy the **entire connection string** shown

### Step 2: Update .env.local

Open `.env.local` and replace your `DATABASE_URL` with the pooler URL.

**Old format (direct - not working):**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.jwlqmbxxnetwewyrvzpx.supabase.co:5432/postgres
```

**New format (pooler - should work):**
```env
DATABASE_URL=postgresql://postgres.jwlqmbxxnetwewyrvzpx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Key differences:**
- Port: `6543` instead of `5432`
- Hostname: `pooler.supabase.com` instead of `db.jwlqmbxxnetwewyrvzpx.supabase.co`
- User format: `postgres.jwlqmbxxnetwewyrvzpx` instead of `postgres`

### Step 3: Test Connection

```bash
node test-prisma-connection.js
```

### Step 4: Seed Products

Once connection works:
```bash
node prisma/seed-products.js
```

## Why Pooler Works

- ✅ IPv4 compatible
- ✅ Better for serverless/Next.js
- ✅ Handles connection limits automatically
- ✅ Recommended by Supabase for Prisma

## Still Having Issues?

1. **Check if database is paused**: Supabase Dashboard → Restore if needed
2. **Verify password**: Reset in Supabase Dashboard → Settings → Database
3. **Check SSL**: Pooler URL should work without extra SSL params

