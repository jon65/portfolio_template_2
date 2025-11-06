-- SQL script to update Product table structure
-- Run this in Supabase Dashboard > SQL Editor

-- Drop the old Product table if it exists (only if you're okay losing existing product data)
DROP TABLE IF EXISTS "Product" CASCADE;

-- Create the new Product table with correct structure
CREATE TABLE "Product" (
    "id" SERIAL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "priceValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '/placeholder.jpg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_product_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_product_updated_at ON "Product";
CREATE TRIGGER update_product_updated_at
    BEFORE UPDATE ON "Product"
    FOR EACH ROW
    EXECUTE FUNCTION update_product_updated_at_column();

