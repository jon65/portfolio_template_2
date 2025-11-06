# Supabase Connection String Setup

## What You Need

For Prisma to connect to Supabase, you need the **PostgreSQL connection string**, not the API keys.

## How to Get Your Connection String

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Navigate to**: Settings → Database
4. **Scroll to**: Connection String section
5. **Select**: "Connection pooling" mode (recommended for Next.js)
6. **Copy** the connection string

## Connection String Format

Your connection string will look like one of these:

**Option 1 (Connection Pooling - Recommended):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Option 2 (Direct Connection):**
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

## Add to .env.local

Once you have the connection string, add it to your `.env.local` file:

```env
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important:**
- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `[YOUR-PROJECT-REF]` with your project reference ID
- Replace `[REGION]` with your region (e.g., `us-east-1`)

## Find Your Database Password

If you don't know your database password:
1. Go to Supabase Dashboard → Settings → Database
2. Look for "Database Password" section
3. If you forgot it, you can reset it (⚠️ this will require updating all connections)

## Next Steps After Adding Connection String

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Push schema to database:**
   ```bash
   npm run db:push
   ```

3. **Start your app:**
   ```bash
   npm run dev
   ```

## Verify Connection

After setup, you can verify the connection works:
- Complete a test order
- Check Supabase Dashboard → Table Editor → Order table
- You should see the order data stored

## Troubleshooting

**"Can't reach database server"**
- Verify the connection string is correct
- Check that your Supabase project is active
- Ensure you're using the connection pooling URL

**"Authentication failed"**
- Verify your database password is correct
- Make sure the password doesn't contain special characters that need URL encoding
- Try resetting your database password in Supabase Dashboard

**"SSL connection required"**
- Add `?sslmode=require` to your connection string

