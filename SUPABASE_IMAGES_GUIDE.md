# Supabase Storage Images Guide

This guide explains how to fetch product images from Supabase Storage buckets using Prisma and the Supabase client SDK.

## Overview

The system now supports fetching product images from Supabase Storage in two ways:

1. **Dedicated Images API** (`/api/products/images`) - Get images for products separately
2. **Integrated Product API** (`/api/products`) - Get products with image URLs included

## Setup

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# Supabase Configuration (already set up)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Optional: Service Role Key (for server-side operations with full access)
# Get from: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase Storage Configuration
SUPABASE_PRODUCT_IMAGES_BUCKET=product-images  # Default bucket name
USE_SUPABASE_IMAGES=true                        # Enable image URL enrichment
SUPABASE_USE_PUBLIC_IMAGES=false                 # Use public URLs (no signing needed)
```

### 2. Create Storage Bucket in Supabase

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name it `product-images` (or your custom name)
4. Choose visibility:
   - **Public**: Images accessible via public URLs (set `SUPABASE_USE_PUBLIC_IMAGES=true`)
   - **Private**: Images require signed URLs (default, more secure)

### 3. Upload Images

Upload product images to your bucket. The file path structure should match what you store in the `Product.image` field in your database.

**Example structure:**
```
product-images/
  ├── products/
  │   ├── 1/
  │   │   ├── main.jpg
  │   │   ├── detail-1.jpg
  │   │   └── detail-2.jpg
  │   ├── 2/
  │   │   └── main.jpg
  │   └── 3/
  │       └── main.jpg
```

**Update Product records:**
```sql
-- Single image
UPDATE "Product" SET image = 'products/1/main.jpg' WHERE id = 1;

-- Multiple images (comma-separated)
UPDATE "Product" SET image = 'products/1/main.jpg,products/1/detail-1.jpg,products/1/detail-2.jpg' WHERE id = 1;

-- Folder path (will list all files in folder)
UPDATE "Product" SET image = 'products/1/' WHERE id = 1;
```

## Usage

### Option 1: Dedicated Images API

Get images separately from products:

```javascript
// Get images for a specific product
const response = await fetch('/api/products/images?productId=1')
const data = await response.json()
// Returns: { productId: 1, productName: "Product Name", images: [...] }

// Get images for all products
const response = await fetch('/api/products/images')
const data = await response.json()
// Returns: [{ productId: 1, images: [...] }, ...]

// Use public URLs instead of signed URLs
const response = await fetch('/api/products/images?productId=1&public=true')

// Use custom bucket
const response = await fetch('/api/products/images?productId=1&bucket=my-bucket')
```

**Response format:**
```json
{
  "productId": 1,
  "productName": "Product Name",
  "images": [
    {
      "url": "https://...signed-url...",
      "path": "products/1/main.jpg",
      "isPublic": false
    },
    {
      "url": "https://...signed-url...",
      "path": "products/1/detail-1.jpg",
      "name": "detail-1.jpg",
      "size": 123456,
      "isPublic": false
    }
  ]
}
```

### Option 2: Integrated Product API

Get products with image URLs automatically included:

```javascript
// Enable in .env.local: USE_SUPABASE_IMAGES=true

// Get all products (includes imageUrl field if enabled)
const response = await fetch('/api/products')
const products = await response.json()
// Each product will have: { ..., image: "products/1/main.jpg", imageUrl: "https://...signed-url..." }

// Get single product
const response = await fetch('/api/products?id=1')
const product = await response.json()
```

**Product response format:**
```json
{
  "id": 1,
  "name": "Product Name",
  "price": "$185",
  "image": "products/1/main.jpg",           // Original path
  "images": ["products/1/main.jpg", "products/1/detail-1.jpg"],  // JSON array (if set)
  "imageBucket": null,                       // Optional bucket override
  "imageUrl": "https://...signed-url...",   // Primary image URL (first image)
  "imageUrls": ["https://...url1...", "https://...url2..."],  // All image URLs
  "imagePaths": ["products/1/main.jpg", "products/1/detail-1.jpg"]  // Original paths
}
```

### Option 3: Client-Side Usage

```javascript
'use client'
import { useState, useEffect } from 'react'

export default function ProductImages({ productId }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch(`/api/products/images?productId=${productId}`)
        const data = await response.json()
        setImages(data.images || [])
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [productId])

  if (loading) return <div>Loading images...</div>

  return (
    <div>
      {images.map((img, index) => (
        <img key={index} src={img.url} alt={`Product image ${index + 1}`} />
      ))}
    </div>
  )
}
```

## API Reference

### GET `/api/products/images`

**Query Parameters:**
- `productId` (optional): Get images for specific product
- `bucket` (optional): Override default bucket name
- `public` (optional): Use public URLs instead of signed URLs

**Returns:**
- Single product: `{ productId, productName, images: [...] }`
- All products: `[{ productId, productName, images: [...] }, ...]`

### Product Schema Structure

The `Product` table now has three fields for storing Supabase Storage image information:

### 1. `image` (String)
- Primary image path in Supabase Storage bucket
- Supports multiple formats:
  - **Single image**: `"products/1/main.jpg"`
  - **Multiple images (comma-separated)**: `"products/1/main.jpg,products/1/detail-1.jpg"`
  - **Folder path**: `"products/1/"` (lists all files in folder)

### 2. `images` (JSON/JSONB, Optional)
- JSON array of image paths (recommended for multiple images)
- Format: `["products/1/main.jpg", "products/1/detail-1.jpg", "products/1/detail-2.jpg"]`
- Takes precedence over `image` field if both are present
- Example SQL:
  ```sql
  UPDATE "Product" 
  SET images = '["products/1/main.jpg", "products/1/detail-1.jpg"]'::jsonb
  WHERE id = 1;
  ```

### 3. `imageBucket` (String, Optional)
- Override default bucket name for this specific product
- If not set, uses `SUPABASE_PRODUCT_IMAGES_BUCKET` environment variable
- Example SQL:
  ```sql
  UPDATE "Product" 
  SET imageBucket = 'premium-products'
  WHERE id = 1;
  ```

## Image Path Formats

The system supports multiple ways to store image paths:

1. **Single image in `image` field**: `"products/1/main.jpg"`
2. **Multiple images in `image` field (comma-separated)**: `"products/1/main.jpg,products/1/detail-1.jpg"`
3. **Multiple images in `images` JSON array** (recommended): `["products/1/main.jpg", "products/1/detail-1.jpg"]`
4. **Folder path in `image` field**: `"products/1/"` (lists all files in folder)

## Security Considerations

### Public vs Private Buckets

- **Public Buckets**: 
  - Images accessible via public URLs
  - No authentication required
  - Set `SUPABASE_USE_PUBLIC_IMAGES=true`
  - Faster (no signing needed)
  - Less secure

- **Private Buckets** (Recommended):
  - Images require signed URLs
  - URLs expire after 1 hour (configurable)
  - More secure
  - Set `SUPABASE_USE_PUBLIC_IMAGES=false` or omit

### Service Role Key

For server-side operations, use the Service Role Key:
- Get from: Supabase Dashboard → Settings → API
- **Never expose to client-side code**
- Has full access (bypasses RLS policies)
- Use for: Server-side image URL generation

### Anon Key

For client-side operations:
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Respects Row Level Security (RLS) policies
- Limited access based on your RLS rules

## Troubleshooting

### Images not loading

1. **Check bucket exists**: Verify bucket name matches `SUPABASE_PRODUCT_IMAGES_BUCKET`
2. **Check file paths**: Ensure `Product.image` field matches actual file paths in bucket
3. **Check permissions**: Verify bucket is public OR service role key is set
4. **Check environment variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL` is set

### Signed URLs not working

1. **Service Role Key**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for server-side operations
2. **Bucket visibility**: Private buckets require signed URLs
3. **URL expiration**: Signed URLs expire after 1 hour by default

### Public URLs not working

1. **Bucket must be public**: Set bucket to public in Supabase Dashboard
2. **Set environment variable**: `SUPABASE_USE_PUBLIC_IMAGES=true`
3. **Check file paths**: Ensure paths are correct

## Example: Complete Setup

1. **Create bucket in Supabase Dashboard**
   - Name: `product-images`
   - Visibility: Private (recommended)

2. **Upload images**
   - Upload to: `products/1/main.jpg`
   - Upload to: `products/2/main.jpg`

3. **Update database**
   
   **Option 1: Using the `image` field (single or comma-separated paths)**
   ```sql
   -- Single image
   UPDATE "Product" SET image = 'products/1/main.jpg' WHERE id = 1;
   
   -- Multiple images (comma-separated)
   UPDATE "Product" SET image = 'products/1/main.jpg,products/1/detail-1.jpg,products/1/detail-2.jpg' WHERE id = 1;
   ```
   
   **Option 2: Using the `images` JSON array field (recommended for multiple images)**
   ```sql
   -- Multiple images as JSON array
   UPDATE "Product" 
   SET images = '["products/1/main.jpg", "products/1/detail-1.jpg", "products/1/detail-2.jpg"]'::jsonb
   WHERE id = 1;
   
   -- Single image in array
   UPDATE "Product" 
   SET images = '["products/2/main.jpg"]'::jsonb
   WHERE id = 2;
   ```
   
   **Option 3: Using product-specific bucket**
   ```sql
   -- Override default bucket for a specific product
   UPDATE "Product" 
   SET image = 'products/1/main.jpg', 
       imageBucket = 'premium-products' 
   WHERE id = 1;
   ```

4. **Set environment variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_PRODUCT_IMAGES_BUCKET=product-images
   USE_SUPABASE_IMAGES=true
   SUPABASE_USE_PUBLIC_IMAGES=false
   ```

5. **Use in your code**
   ```javascript
   const response = await fetch('/api/products/images?productId=1')
   const { images } = await response.json()
   // images[0].url contains the signed URL
   ```

## Next Steps

- Consider adding image optimization (resizing, compression)
- Implement image caching strategy
- Add support for multiple image variants (thumbnail, medium, large)
- Set up CDN for faster image delivery

