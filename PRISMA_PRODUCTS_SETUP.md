# Product Database Integration Guide

This guide explains how to integrate Prisma with Supabase to fetch products from your database.

## Overview

The product fetching system now supports three data sources in priority order:
1. **Supabase Database (via Prisma)** - Primary source
2. **External API** - Fallback if database is unavailable
3. **Local Data** - Final fallback

## Setup Steps

### 1. Create the Product Table in Supabase

Run the SQL script in your Supabase Dashboard:

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the contents of `prisma/create-product-table.sql`
3. Click "Run" to execute the script

This will create:
- The `Product` table with all required fields
- Indexes for better query performance
- A trigger to automatically update the `updatedAt` timestamp

### 2. Generate Prisma Client

**IMPORTANT**: Make sure `DATABASE_URL` is set in your `.env` or `.env.local` file before generating the Prisma client.

After updating the schema, generate the Prisma client:

```bash
npx prisma generate
```

**Note**: If you get an error about missing `DATABASE_URL`, make sure your `.env.local` file contains your Supabase connection string. The Prisma client generation needs this to read the schema configuration.

### 3. Run Database Migrations (Optional)

If you're using Prisma migrations:

```bash
npx prisma migrate dev --name add_product_table
```

Or push the schema directly:

```bash
npx prisma db push
```

### 4. Seed Initial Products (Optional)

To populate your database with sample products from your local data:

```bash
node prisma/seed-products.js
```

This will insert all products from `app/data/products.js` into your Supabase database.

### 5. Environment Variables

Make sure your `.env` file includes:

```env
DATABASE_URL="your-supabase-connection-string"
```

The system will automatically use the database if `DATABASE_URL` is set. To disable database usage, set:

```env
USE_PRODUCTS_DATABASE=false
```

## How It Works

### Priority System

The `getProducts()` and `getProduct(id)` functions in `app/lib/products.js` follow this priority:

1. **Database (Prisma/Supabase)**: If `DATABASE_URL` is set and `USE_PRODUCTS_DATABASE` is not `false`
2. **External API**: If `USE_PRODUCTS_API=true` and `PRODUCTS_API_URL` is set
3. **Local Data**: Falls back to `app/data/products.js`

### API Route

The `/api/products` route now uses the centralized `getProducts()` and `getProduct()` functions, which handle all fallback logic automatically.

## Product Model Schema

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  category    String
  name        String
  price       String   // Formatted price string like "$185"
  priceValue  Float    // Numeric price value for calculations
  description String   @default("")
  image       String   @default("/placeholder.jpg")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([name])
}
```

## Testing

1. **Test Database Connection**:
   ```bash
   node test-prisma-connection.js
   ```

2. **Test Product Fetching**:
   - Start your Next.js dev server: `npm run dev`
   - Visit `http://localhost:3000/api/products` to see all products
   - Visit `http://localhost:3000/api/products?id=1` to see a single product

3. **Check Logs**: The console will show which data source is being used:
   - `"Fetched X products from database"` - Using Supabase
   - `"Fetched X products from external API"` - Using external API
   - `"Using local product data"` - Using local fallback

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correctly set in your `.env` file
- Check that your Supabase project is active
- Ensure the Product table exists in your database

### Products Not Showing

- Check browser console and server logs for errors
- Verify products exist in the database: `SELECT * FROM "Product";`
- Try seeding products: `node prisma/seed-products.js`

### Prisma Client Errors

**Error: "Cannot read properties of undefined (reading 'findFirst')"**
- This means the Prisma client hasn't been generated with the Product model
- Run: `npx prisma generate`
- Make sure `DATABASE_URL` is set in your `.env.local` file
- Restart your Next.js dev server after generating

**Error: "Missing required environment variable: DATABASE_URL"**
- Make sure your `.env.local` file exists and contains `DATABASE_URL`
- The connection string should look like: `postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres`
- After setting `DATABASE_URL`, run `npx prisma generate` again

## Next Steps

- Add product management endpoints (POST, PUT, DELETE) if needed
- Implement product search/filtering in the database
- Add product images to Supabase Storage
- Set up product caching strategies

