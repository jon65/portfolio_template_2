-- SQL Script to create Product table in Supabase
-- Run this in Supabase Dashboard > SQL Editor

-- Create Product table
CREATE TABLE IF NOT EXISTS "Product" (
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_product_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS update_product_updated_at ON "Product";
CREATE TRIGGER update_product_updated_at
    BEFORE UPDATE ON "Product"
    FOR EACH ROW
    EXECUTE FUNCTION update_product_updated_at_column();

-- Optional: Insert sample products (uncomment if you want to seed initial data)
/*
INSERT INTO "Product" ("category", "name", "price", "priceValue", "description", "image")
VALUES
    ('Essentials', 'Oversized Hoodie', '$185', 185, 'Premium oversized hoodie crafted from the finest materials. Perfect for everyday comfort and style.', '/placeholder-hoodie.jpg'),
    ('Essentials', 'Relaxed Tee', '$95', 95, 'Classic relaxed fit tee with premium cotton blend. Essential for any wardrobe.', '/placeholder-tee.jpg'),
    ('Essentials', 'Sweat Pants', '$165', 165, 'Comfortable and stylish sweat pants designed for both lounging and active wear.', '/placeholder-pants.jpg'),
    ('Collection', 'Knit Sweater', '$345', 345, 'Luxurious knit sweater with premium yarn. Perfect for layering in cooler weather.', '/placeholder-sweater.jpg'),
    ('Athletics', 'Track Jacket', '$285', 285, 'Performance track jacket with moisture-wicking technology. Ideal for active lifestyles.', '/placeholder-jacket.jpg'),
    ('Essentials', 'Crew Neck', '$125', 125, 'Classic crew neck sweater in a relaxed fit. Versatile and comfortable.', '/placeholder-crew.jpg')
ON CONFLICT DO NOTHING;
*/

