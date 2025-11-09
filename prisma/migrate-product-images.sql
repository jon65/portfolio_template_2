-- Migration script to update Product table for Supabase Storage image support
-- Run this in Supabase Dashboard > SQL Editor
-- This adds support for storing Supabase Storage bucket image paths

-- Add new columns for enhanced image storage
ALTER TABLE "Product" 
  ADD COLUMN IF NOT EXISTS "images" JSONB,
  ADD COLUMN IF NOT EXISTS "imageBucket" TEXT;

-- Update existing image field to be more explicit (if it contains placeholder, set to empty)
UPDATE "Product" 
SET "image" = '' 
WHERE "image" = '/placeholder.jpg' OR "image" LIKE '/%';

-- Add comment to image field to clarify it's for Supabase Storage paths
COMMENT ON COLUMN "Product"."image" IS 'Path to image in Supabase Storage bucket (e.g., "products/1/main.jpg"). Can be single path, comma-separated paths, or folder path ending with "/"';
COMMENT ON COLUMN "Product"."images" IS 'JSON array of image paths in Supabase Storage bucket (e.g., ["products/1/main.jpg", "products/1/detail-1.jpg"])';
COMMENT ON COLUMN "Product"."imageBucket" IS 'Optional: Override default Supabase Storage bucket name for this product';

-- Create index on imageBucket for faster queries (if you filter by bucket)
CREATE INDEX IF NOT EXISTS "Product_imageBucket_idx" ON "Product"("imageBucket") WHERE "imageBucket" IS NOT NULL;

-- Example: Migrate existing single image paths to new format
-- If you have existing products with image paths, you can convert them:
-- UPDATE "Product" SET "images" = jsonb_build_array("image") WHERE "image" != '' AND "images" IS NULL;

