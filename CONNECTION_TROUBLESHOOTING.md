# Connection Troubleshooting

## Current Status

✅ Prisma Client generated successfully
❌ Database connection failed

## Next Steps

### 1. Check Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project (`jwlqmbxxnetwewyrvzpx`)
3. Check if the database is **active** (not paused)
   - If paused, click "Restore" to wake it up

### 2. Get the Correct Connection String

1. In Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **"Connection pooling"** mode
4. Copy the **exact** connection string shown
5. It should look like one of these formats:

**Format 1 (Connection Pooling):**
```
postgresql://postgres.jwlqmbxxnetwewyrvzpx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Format 2 (Direct with SSL):**
```
postgresql://postgres:[PASSWORD]@db.jwlqmbxxnetwewyrvzpx.supabase.co:5432/postgres?sslmode=require
```

### 3. Update .env.local

Replace the `DATABASE_URL` in `.env.local` with the connection string from Supabase Dashboard.

### 4. Try Again

```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="your_connection_string_here"

# Generate Prisma Client (already done ✅)
npm run db:generate

# Push schema to database
npm run db:push
```

## Common Issues

### Database is Paused
- **Symptom**: "Can't reach database server"
- **Solution**: Go to Supabase Dashboard → Restore database

### Wrong Connection String Format
- **Symptom**: Connection timeout
- **Solution**: Use the connection pooling URL from Supabase Dashboard

### SSL Required
- **Symptom**: SSL connection error
- **Solution**: Add `?sslmode=require` to connection string

### Password Issues
- **Symptom**: Authentication failed
- **Solution**: Reset database password in Supabase Dashboard → Settings → Database

## Once Connected

After `npm run db:push` succeeds:
1. ✅ Tables will be created in Supabase
2. ✅ Orders will be stored in the database
3. ✅ Admin panel will show orders from database
4. ✅ You can view orders in Supabase Dashboard → Table Editor

## Alternative: Use Supabase Client SDK

If Prisma connection continues to fail, you can use Supabase Client SDK instead:

1. Install: `npm install @supabase/supabase-js`
2. Create client: `app/lib/supabase.js`
3. Use Supabase client for database operations

But Prisma is recommended for better type safety and server-side security.

