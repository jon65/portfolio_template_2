# Quick Connection Test Guide

## Current Issue
Connection to `db.jwlqmbxxnetwewyrvzpx.supabase.co:5432` is failing.

## Solutions to Try

### Solution 1: Check Database Status
1. Go to https://app.supabase.com/project/jwlqmbxxnetwewyrvzpx
2. Check if database shows "Paused" status
3. If paused, click "Restore" button
4. Wait 1-2 minutes for database to start

### Solution 2: Get Connection Pooling URL
The direct connection (port 5432) might be blocked. Try connection pooling:

1. Go to Supabase Dashboard → Settings → Database
2. Scroll to "Connection String" section
3. Select "Connection pooling" tab
4. Copy the connection string (it will look different)
5. Update `.env.local` with that exact string

### Solution 3: Test Connection String Format
Try adding these parameters to your connection string:

```env
# Current (not working):
DATABASE_URL=postgresql://postgres:2Q2r2X-jnvmqpjc@db.jwlqmbxxnetwewyrvzpx.supabase.co:5432/postgres?sslmode=require

# Try with connection_limit:
DATABASE_URL=postgresql://postgres:2Q2r2X-jnvmqpjc@db.jwlqmbxxnetwewyrvzpx.supabase.co:5432/postgres?sslmode=require&connection_limit=1

# Or try connection pooling format (if available):
DATABASE_URL=postgresql://postgres.jwlqmbxxnetwewyrvzpx:2Q2r2X-jnvmqpjc@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Solution 4: Verify Password
1. Go to Supabase Dashboard → Settings → Database
2. Check "Database Password" section
3. If unsure, reset the password
4. Update `.env.local` with new password

## Test After Changes

After making changes, test again:
```bash
node test-prisma-connection.js
```

## Alternative: Use Supabase Client SDK

If Prisma connection continues to fail, you can use Supabase Client SDK instead for now:

```bash
npm install @supabase/supabase-js
```

Then use Supabase client for database operations (though Prisma is preferred for type safety).

