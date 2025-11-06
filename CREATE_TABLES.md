# Create Tables in Supabase

## Problem
Prisma's schema engine (`db push` and `migrate`) doesn't work with connection poolers due to prepared statement conflicts.

## Solution: Run SQL Manually

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com/project/jwlqmbxxnetwewyrvzpx
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the SQL Script
1. Copy the contents of `create-order-table.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Tables Created
1. Go to **Table Editor** in Supabase Dashboard
2. You should see the `Order` table with all columns
3. Check that indexes are created (Database → Indexes)

### Step 4: Test Connection Again
```bash
node test-prisma-connection.js
```

You should now see:
```
✅ Order table exists
   Total orders: 0
```

## After Tables Are Created

Once the tables exist, your Prisma connection will work perfectly for:
- ✅ Reading orders
- ✅ Creating orders
- ✅ Updating order status
- ✅ Querying metrics

The connection pooler works fine for runtime operations - it's only the schema operations that have issues.

## Alternative: Use Direct Connection for Schema Ops

If you have IPv6 support, you can temporarily switch to direct connection for schema operations:

1. Change `DATABASE_URL` to direct connection
2. Run `npm run db:push`
3. Change back to pooler connection

But running SQL manually is simpler and works reliably.

