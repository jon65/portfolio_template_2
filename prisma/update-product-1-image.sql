-- Update Product 1 with Supabase Storage image path
-- Run this in Supabase Dashboard > SQL Editor

-- Option 1: Store single image in 'image' field
UPDATE "Product" 
SET image = 'products/1/OIP.webp'
WHERE id = 1;

-- Option 2: Store in 'images' JSON array (recommended if you'll add more images later)
UPDATE "Product" 
SET images = '["products/1/OIP.webp"]'::jsonb,
    image = 'products/1/OIP.webp'  -- Keep for backward compatibility
WHERE id = 1;

-- Verify the update
SELECT id, name, image, images, "imageBucket" 
FROM "Product" 
WHERE id = 1;

