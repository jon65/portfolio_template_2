# Product Images Schema - Supabase Storage Integration

## Overview

The `Product` table has been updated to support storing image paths/links from Supabase Storage buckets. The backend can retrieve these images using the Supabase Storage API.

## Schema Fields

### `image` (String)
- **Purpose**: Primary image path in Supabase Storage bucket
- **Default**: Empty string (`""`)
- **Format Examples**:
  - Single image: `"products/1/main.jpg"`
  - Multiple images (comma-separated): `"products/1/main.jpg,products/1/detail-1.jpg"`
  - Folder path: `"products/1/"` (will list all files in folder)
- **Usage**: Backward compatible with existing single image setup

### `images` (JSON/JSONB, Optional)
- **Purpose**: JSON array of image paths for multiple images
- **Default**: `NULL`
- **Format**: `["products/1/main.jpg", "products/1/detail-1.jpg", "products/1/detail-2.jpg"]`
- **Priority**: Takes precedence over `image` field if both are present
- **Recommended**: Use this field for products with multiple images

### `imageBucket` (String, Optional)
- **Purpose**: Override default Supabase Storage bucket name for this product
- **Default**: `NULL` (uses `SUPABASE_PRODUCT_IMAGES_BUCKET` env var)
- **Use Case**: Different products can use different buckets if needed
- **Example**: `"premium-products"`, `"sale-items"`, etc.

## Database Migration

To update your existing database, run the migration script:

```bash
# In Supabase Dashboard > SQL Editor, run:
```

Or use the provided SQL file:
```sql
-- See: prisma/migrate-product-images.sql
```

This will:
1. Add `images` (JSONB) column
2. Add `imageBucket` (TEXT) column
3. Add index on `imageBucket`
4. Update existing placeholder images to empty strings

## Usage Examples

### Example 1: Single Image
```sql
INSERT INTO "Product" (category, name, price, "priceValue", description, image)
VALUES ('Essentials', 'Hoodie', '$185', 185, 'Premium hoodie', 'products/1/main.jpg');
```

### Example 2: Multiple Images (JSON Array - Recommended)
```sql
INSERT INTO "Product" (category, name, price, "priceValue", description, image, images)
VALUES (
  'Essentials', 
  'Hoodie', 
  '$185', 
  185, 
  'Premium hoodie',
  'products/1/main.jpg',  -- Primary image (fallback)
  '["products/1/main.jpg", "products/1/detail-1.jpg", "products/1/detail-2.jpg"]'::jsonb
);
```

### Example 3: Product-Specific Bucket
```sql
INSERT INTO "Product" (category, name, price, "priceValue", description, image, "imageBucket")
VALUES (
  'Essentials', 
  'Premium Hoodie', 
  '$285', 
  285, 
  'Premium hoodie',
  'products/1/main.jpg',
  'premium-products'  -- Uses different bucket
);
```

### Example 4: Update Existing Product
```sql
-- Add multiple images to existing product
UPDATE "Product" 
SET images = '["products/1/main.jpg", "products/1/detail-1.jpg"]'::jsonb
WHERE id = 1;

-- Change bucket for specific product
UPDATE "Product" 
SET "imageBucket" = 'sale-items'
WHERE id = 2;
```

## Backend Retrieval

The backend automatically retrieves images from Supabase Storage using these fields:

### API Response Format

When `USE_SUPABASE_IMAGES=true` is set, products include:

```json
{
  "id": 1,
  "name": "Product Name",
  "image": "products/1/main.jpg",                    // Original path
  "images": ["products/1/main.jpg", "..."],           // Original paths array
  "imageBucket": null,                                // Bucket used
  "imageUrl": "https://...signed-url...",            // Primary image URL
  "imageUrls": ["https://...url1...", "..."],         // All image URLs
  "imagePaths": ["products/1/main.jpg", "..."]        // Original paths
}
```

### Priority Order

1. **`images` JSON array** (if present and not empty)
2. **`image` field** (parsed as comma-separated or single path)
3. Empty array (if no images found)

### Bucket Selection

1. **`imageBucket` field** (if set on product)
2. **`SUPABASE_PRODUCT_IMAGES_BUCKET`** environment variable
3. **Default**: `"product-images"`

## API Endpoints

### Get Product Images
```javascript
// Get images for specific product
GET /api/products/images?productId=1

// Response:
{
  "productId": 1,
  "productName": "Product Name",
  "bucket": "product-images",
  "images": [
    {
      "url": "https://...signed-url...",
      "path": "products/1/main.jpg",
      "bucket": "product-images",
      "isPublic": false
    }
  ]
}
```

### Get Products with Images
```javascript
// Get all products (includes image URLs if USE_SUPABASE_IMAGES=true)
GET /api/products

// Response includes imageUrl and imageUrls fields
```

## Best Practices

1. **Use `images` JSON array** for products with multiple images
2. **Use `image` field** for single images or backward compatibility
3. **Set `imageBucket`** only if product needs different bucket
4. **Store paths relative to bucket root** (e.g., `"products/1/main.jpg"` not `"/products/1/main.jpg"`)
5. **Use consistent folder structure** (e.g., `products/{id}/` for each product)

## Migration from Old Schema

If you have existing products with the old schema:

```sql
-- Option 1: Migrate single images to images array
UPDATE "Product" 
SET images = jsonb_build_array(image)
WHERE image != '' AND images IS NULL;

-- Option 2: Keep using image field (backward compatible)
-- No changes needed - existing code will continue to work
```

## Troubleshooting

### Images not showing
1. Check that paths in database match actual files in Supabase Storage
2. Verify bucket name matches `SUPABASE_PRODUCT_IMAGES_BUCKET`
3. Check that files exist in Supabase Storage
4. Verify environment variables are set correctly

### JSON parsing errors
- Ensure `images` field contains valid JSON array
- Use `::jsonb` cast in SQL: `'["path1", "path2"]'::jsonb`
- Check for trailing commas or invalid JSON syntax

### Bucket not found
- Verify bucket exists in Supabase Dashboard > Storage
- Check bucket name matches exactly (case-sensitive)
- Ensure bucket permissions are set correctly

