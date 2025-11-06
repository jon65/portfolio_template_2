# Supabase & Prisma Setup Guide

This guide will help you set up Prisma with your Supabase PostgreSQL database.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Node.js and npm installed
- Prisma CLI installed (included in package.json)

## Step 1: Get Your Supabase Connection String

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **Database**
3. Scroll down to **Connection String**
4. Select **Connection pooling** mode (recommended for serverless/Next.js)
5. Copy the connection string - it will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 2: Add Database URL to Environment Variables

1. Create or update your `.env.local` file in the project root
2. Add your Supabase connection string:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@your-project.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   ```

**Important Notes:**
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Use the **Connection pooling** URL for Next.js serverless functions
- The password is your database password, not your Supabase account password
- You can find your password in Supabase Dashboard → Settings → Database → Database Password

## Step 3: Generate Prisma Client

Run the following command to generate the Prisma Client:

```bash
npx prisma generate
```

This will create the Prisma Client based on your schema.

## Step 4: Push Schema to Database

Push your Prisma schema to create the tables in Supabase:

```bash
npx prisma db push
```

This will:
- Create the `Order` table in your Supabase database
- Create all necessary indexes
- Set up the `OrderStatus` enum

**Alternative: Use Migrations (Recommended for Production)**

For production, use migrations instead:

```bash
# Create a migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy
```

## Step 5: Verify Setup

1. Check your Supabase Dashboard → **Table Editor**
2. You should see an `Order` table with all the columns from the schema
3. Verify the indexes are created in **Database** → **Indexes**

## Step 6: Test the Connection

The application will automatically use the database when `DATABASE_URL` is set. To test:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Complete a test order (or use test mode)
3. Check your Supabase Dashboard → **Table Editor** → **Order** table
4. You should see the order data stored in the database

## How It Works

The application uses a **hybrid storage approach**:

- **If `DATABASE_URL` is set**: Orders are stored in Supabase PostgreSQL via Prisma
- **If `DATABASE_URL` is not set**: Orders fall back to in-memory storage (for development/testing)

This means:
- ✅ You can develop without a database connection
- ✅ Production automatically uses the database when configured
- ✅ Graceful fallback if database connection fails

## Prisma Studio (Optional)

View and edit your database data with Prisma Studio:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all orders
- Edit order data
- Filter and search orders
- Update order statuses

## Troubleshooting

### Connection Issues

**Error: "Can't reach database server"**
- Verify your connection string is correct
- Check that your Supabase project is active
- Ensure you're using the connection pooling URL

**Error: "Authentication failed"**
- Verify your database password is correct
- Check that the password doesn't contain special characters that need URL encoding

**Error: "SSL connection required"**
- Add `?sslmode=require` to your connection string:
  ```
  DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1&sslmode=require
  ```

### Schema Issues

**Error: "Table already exists"**
- If you need to reset: `npx prisma migrate reset` (⚠️ deletes all data)
- Or manually drop the table in Supabase Dashboard

**Error: "Enum already exists"**
- The `OrderStatus` enum might already exist
- You can drop it manually or use `prisma migrate reset`

### Prisma Client Issues

**Error: "PrismaClient is not initialized"**
- Run `npx prisma generate` to regenerate the client
- Restart your development server

## Production Deployment

When deploying to production (e.g., Vercel):

1. Add `DATABASE_URL` to your hosting platform's environment variables
2. Run migrations during build:
   ```bash
   npx prisma migrate deploy
   ```
3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

## Next Steps

- ✅ Orders are now stored in Supabase
- ✅ Admin panel will show orders from the database
- ✅ Order status updates persist in the database
- ✅ Metrics are calculated from database data

For more information, see:
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Prisma Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

