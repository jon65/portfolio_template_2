-- SQL Script to create Order table in Supabase
-- Run this in Supabase Dashboard > SQL Editor

-- Create OrderStatus enum
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('ORDERED', 'COURIERED', 'DELIVERED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Order table
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerFirstName" TEXT NOT NULL,
    "customerLastName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingState" TEXT NOT NULL,
    "shippingZipCode" TEXT NOT NULL,
    "shippingCountry" TEXT NOT NULL DEFAULT 'US',
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "total" DOUBLE PRECISION NOT NULL,
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'ORDERED',
    "statusUpdatedAt" TIMESTAMP(3),
    "isTestMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on orderId
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderId_key" ON "Order"("orderId");

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Order_orderId_idx" ON "Order"("orderId");
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx" ON "Order"("customerEmail");
CREATE INDEX IF NOT EXISTS "Order_orderStatus_idx" ON "Order"("orderStatus");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_isTestMode_idx" ON "Order"("isTestMode");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS update_order_updated_at ON "Order";
CREATE TRIGGER update_order_updated_at
    BEFORE UPDATE ON "Order"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
