# Prisma Guide for This Project

A comprehensive guide to understanding, setting up, and working with Prisma in this Next.js e-commerce application.

## Table of Contents

1. [What is Prisma?](#what-is-prisma)
2. [How Prisma Works in This Project](#how-prisma-works-in-this-project)
3. [Project Structure](#project-structure)
4. [Setup and Configuration](#setup-and-configuration)
5. [Schema Overview](#schema-overview)
6. [How to Edit the Schema](#how-to-edit-the-schema)
7. [Common Operations](#common-operations)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## What is Prisma?

Prisma is a **next-generation ORM (Object-Relational Mapping)** tool that provides:

- **Type-safe database access** - Auto-generated TypeScript types
- **Database migrations** - Version control for your database schema
- **Query builder** - Intuitive API for database operations
- **Database introspection** - Pull existing schema from database

In this project, Prisma connects to **Supabase PostgreSQL** database and provides a type-safe way to interact with your data.

---

## How Prisma Works in This Project

### Architecture Flow

```
┌─────────────────┐
│  Next.js App    │
│  (API Routes)   │
└────────┬────────┘
         │
         │ Uses Prisma Client
         ▼
┌─────────────────┐
│  Prisma Client  │  ← Generated from schema.prisma
│  (Type-safe)    │
└────────┬────────┘
         │
         │ SQL Queries
         ▼
┌─────────────────┐
│  Supabase       │
│  PostgreSQL     │
└─────────────────┘
```

### Key Components

1. **`prisma/schema.prisma`** - Defines your database schema (models, fields, relationships)
2. **`prisma.config.ts`** - Configuration file for Prisma CLI
3. **`app/lib/prisma.js`** - Singleton Prisma client instance
4. **Generated Prisma Client** - Auto-generated TypeScript client in `node_modules/@prisma/client`

### Usage in Code

```javascript
// Import the Prisma client
import { prisma } from '@/app/lib/prisma'

// Query products
const products = await prisma.product.findMany()

// Create an order
const order = await prisma.order.create({
  data: {
    orderId: 'order_123',
    customerEmail: 'customer@example.com',
    // ... other fields
  }
})
```

---

## Project Structure

```
portfolio_template_2/
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   ├── prisma.config.ts        # Prisma configuration
│   ├── seed-products.js        # Seed script for products
│   ├── create-order-table.sql  # SQL for Order table
│   └── create-product-table.sql # SQL for Product table
│
├── app/
│   └── lib/
│       ├── prisma.js           # Prisma client singleton
│       ├── products.js         # Product queries (uses Prisma)
│       └── order-storage-db.js # Order operations (uses Prisma)
│
└── .env.local                  # Database connection string
```

---

## Setup and Configuration

### 1. Environment Variables

Create `.env.local` file in the project root:

```env
DATABASE_URL=postgresql://postgres.jwlqmbxxnetwewyrvzpx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important**: Use the **Connection Pooler** URL from Supabase (port 6543), not the direct connection.

### 2. Prisma Configuration (`prisma.config.ts`)

This file:
- Loads environment variables from `.env.local`
- Configures Prisma to use your schema file
- Sets up migration paths

```typescript
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
```

### 3. Prisma Client (`app/lib/prisma.js`)

Singleton pattern to prevent multiple connections:

```javascript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Why singleton?** Prevents connection exhaustion in development (Next.js hot reload creates new instances).

---

## Schema Overview

### Current Models

#### 1. Order Model

Stores customer orders with payment and shipping information.

```prisma
model Order {
  id              String      @id @default(uuid())
  orderId         String      @unique
  paymentIntentId String?
  
  // Customer Information
  customerEmail   String
  customerFirstName String
  customerLastName  String
  customerPhone    String?
  
  // Shipping Address
  shippingAddress  String
  shippingCity     String
  shippingState    String
  shippingZipCode  String
  shippingCountry  String      @default("US")
  
  // Order Details
  items            Json        // Array of products
  subtotal         Float
  shippingCost     Float       @default(10.0)
  total            Float
  
  // Order Status
  orderStatus      OrderStatus @default(ORDERED)
  statusUpdatedAt  DateTime?
  
  // Metadata
  isTestMode       Boolean     @default(false)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  
  @@index([orderId])
  @@index([customerEmail])
  @@index([orderStatus])
  @@index([createdAt])
  @@index([isTestMode])
}
```

**Key Fields:**
- `id` - UUID primary key
- `orderId` - Unique Stripe payment intent ID
- `items` - JSON array of order items
- `orderStatus` - Enum (ORDERED, COURIERED, DELIVERED)

#### 2. Product Model

Stores product catalog information.

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  category    String
  name        String
  price       String   // Formatted like "$185"
  priceValue  Float    // Numeric for calculations
  description String   @default("")
  image       String   @default("/placeholder.jpg")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([name])
}
```

**Key Fields:**
- `id` - Auto-incrementing integer
- `price` - Formatted string for display
- `priceValue` - Numeric value for calculations
- Indexed by `category` and `name` for fast queries

#### 3. OrderStatus Enum

```prisma
enum OrderStatus {
  ORDERED
  COURIERED
  DELIVERED
}
```

---

## How to Edit the Schema

### Step-by-Step Guide

#### 1. Edit `prisma/schema.prisma`

Make your changes to models, fields, or relationships:

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  category    String
  name        String
  price       String
  priceValue  Float
  description String   @default("")
  image       String   @default("/placeholder.jpg")
  
  // ADD NEW FIELD HERE
  stock       Int      @default(0)  // ← New field
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([name])
}
```

#### 2. Generate Prisma Client

After editing the schema, regenerate the client:

```bash
npx prisma generate
```

This updates the TypeScript types and query methods.

#### 3. Sync Database Schema

**Option A: Push Changes (Development)**

```bash
npx prisma db push
```

- ✅ Fast and simple
- ✅ Good for development
- ⚠️ No migration history
- ⚠️ Can lose data if not careful

**Option B: Create Migration (Production)**

```bash
# Create migration
npx prisma migrate dev --name add_stock_to_product

# Apply migration
npx prisma migrate deploy
```

- ✅ Version controlled
- ✅ Safe for production
- ✅ Can rollback
- ⚠️ More steps

#### 4. Update Your Code

After schema changes, update code that uses the model:

```javascript
// Old code
const product = await prisma.product.findUnique({
  where: { id: 1 }
})

// New code (if you added stock field)
const product = await prisma.product.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    name: true,
    stock: true,  // ← Use new field
  }
})
```

### Common Schema Edits

#### Adding a Field

```prisma
model Product {
  // ... existing fields
  newField String  // Required field
  optionalField String?  // Optional field
  defaultField String @default("default")  // With default
}
```

#### Adding an Index

```prisma
model Product {
  // ... fields
  @@index([newField])  // Single field index
  @@index([field1, field2])  // Composite index
}
```

#### Adding a Relationship

```prisma
model Order {
  // ... fields
  userId String
  user   User @relation(fields: [userId], references: [id])
}

model User {
  id     String @id @default(uuid())
  email  String
  orders Order[]
}
```

#### Changing Field Type

```prisma
// Before
price String

// After
price Decimal @db.Decimal(10, 2)
```

**⚠️ Warning**: Changing types may require data migration!

---

## Common Operations

### Query Products

```javascript
import { prisma } from '@/app/lib/prisma'

// Get all products
const products = await prisma.product.findMany({
  orderBy: { id: 'asc' }
})

// Get product by ID
const product = await prisma.product.findUnique({
  where: { id: 1 }
})

// Filter products
const essentials = await prisma.product.findMany({
  where: {
    category: 'Essentials'
  }
})

// Search products
const searchResults = await prisma.product.findMany({
  where: {
    name: {
      contains: 'Hoodie',
      mode: 'insensitive'
    }
  }
})
```

### Create Order

```javascript
const order = await prisma.order.create({
  data: {
    orderId: 'order_123',
    customerEmail: 'customer@example.com',
    customerFirstName: 'John',
    customerLastName: 'Doe',
    shippingAddress: '123 Main St',
    shippingCity: 'New York',
    shippingState: 'NY',
    shippingZipCode: '10001',
    shippingCountry: 'US',
    items: [
      { id: 1, name: 'Hoodie', quantity: 1, price: 185 }
    ],
    subtotal: 185,
    shippingCost: 10,
    total: 195,
    orderStatus: 'ORDERED',
    isTestMode: false
  }
})
```

### Update Order Status

```javascript
const updatedOrder = await prisma.order.update({
  where: { orderId: 'order_123' },
  data: {
    orderStatus: 'COURIERED',
    statusUpdatedAt: new Date()
  }
})
```

### Query Orders

```javascript
// Get all orders
const orders = await prisma.order.findMany({
  orderBy: { createdAt: 'desc' }
})

// Get orders by status
const pendingOrders = await prisma.order.findMany({
  where: {
    orderStatus: 'ORDERED'
  }
})

// Get orders by customer
const customerOrders = await prisma.order.findMany({
  where: {
    customerEmail: 'customer@example.com'
  }
})
```

### Delete Records

```javascript
// Delete a product
await prisma.product.delete({
  where: { id: 1 }
})

// Delete multiple orders
await prisma.order.deleteMany({
  where: {
    isTestMode: true
  }
})
```

---

## Best Practices

### 1. Always Generate Client After Schema Changes

```bash
npx prisma generate
```

### 2. Use Migrations for Production

```bash
npx prisma migrate dev --name descriptive_name
```

### 3. Test Schema Changes Locally First

```bash
# Test locally
npx prisma db push

# Then create migration for production
npx prisma migrate dev --name change_name
```

### 4. Use Transactions for Multiple Operations

```javascript
await prisma.$transaction([
  prisma.order.create({ data: orderData }),
  prisma.product.update({
    where: { id: 1 },
    data: { stock: { decrement: 1 } }
  })
])
```

### 5. Handle Errors Gracefully

```javascript
try {
  const product = await prisma.product.findUnique({
    where: { id: 1 }
  })
  
  if (!product) {
    return null // Handle not found
  }
  
  return product
} catch (error) {
  console.error('Database error:', error)
  throw error
}
```

### 6. Use Select to Limit Fields

```javascript
// Only fetch needed fields
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    price: true
    // Don't fetch description, image, etc.
  }
})
```

### 7. Use Indexes for Frequently Queried Fields

```prisma
model Product {
  // ... fields
  @@index([category])  // If you query by category often
  @@index([name])      // If you search by name
}
```

---

## Troubleshooting

### Error: "Cannot read properties of undefined"

**Problem**: Prisma client not generated or model doesn't exist.

**Solution**:
```bash
npx prisma generate
```

### Error: "Can't reach database server"

**Problem**: Wrong connection string or database paused.

**Solution**:
1. Check `DATABASE_URL` in `.env.local`
2. Use Connection Pooler URL (port 6543)
3. Verify Supabase project is active

### Error: "Migration drift detected"

**Problem**: Database schema doesn't match migration history.

**Solution**:
```bash
# Reset migrations (development only!)
npx prisma migrate reset

# Or baseline existing database
npx prisma migrate resolve --applied baseline
```

### Error: "Field doesn't exist"

**Problem**: Schema changed but client not regenerated.

**Solution**:
```bash
npx prisma generate
# Restart your dev server
```

### Schema Out of Sync

**Problem**: Database structure doesn't match schema.

**Solution**:
```bash
# Push schema to database
npx prisma db push

# Or create migration
npx prisma migrate dev --name sync_schema
```

### Connection Pool Exhausted

**Problem**: Too many connections.

**Solution**:
- Use Connection Pooler URL (already configured)
- Restart dev server
- Check for connection leaks

---

## Quick Reference

### Essential Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (dev)
npx prisma db push

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# View database in browser
npx prisma studio

# Pull schema from database
npx prisma db pull

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### File Locations

- **Schema**: `prisma/schema.prisma`
- **Config**: `prisma.config.ts`
- **Client**: `app/lib/prisma.js`
- **Environment**: `.env.local`

### Useful Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

---

## Summary

Prisma in this project:

1. **Defines schema** in `prisma/schema.prisma`
2. **Generates type-safe client** with `npx prisma generate`
3. **Syncs to database** with `npx prisma db push` or migrations
4. **Used in code** via `app/lib/prisma.js` singleton

To make changes:
1. Edit `schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (or create migration)
4. Update your code to use new fields/types

That's it! 🎉

