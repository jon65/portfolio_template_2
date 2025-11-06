# Products API Integration Guide

This guide explains how to integrate your products API with the application.

## Setup Options

### Option 1: Use Next.js API Route (Recommended)

The application includes a Next.js API route at `/app/api/products/route.js` that can:
- Proxy requests to your external API
- Serve local data as fallback
- Add authentication/authorization
- Transform data formats

**To use with external API:**

1. Add to your `.env.local`:
```env
# Products API Configuration
PRODUCTS_API_URL=https://your-api.com/api
PRODUCTS_API_KEY=your_api_key_here  # Optional, if your API requires auth
```

2. The API route will automatically proxy requests to your external API.

### Option 2: Direct External API Integration

If you want to call your API directly from the client:

1. Add to your `.env.local`:
```env
# Products API Configuration (Client-side)
NEXT_PUBLIC_PRODUCTS_API_URL=https://your-api.com/api
NEXT_PUBLIC_USE_PRODUCTS_API=true
PRODUCTS_API_KEY=your_api_key_here  # Server-side only
```

2. The `app/lib/products.js` will fetch directly from your API.

## API Response Format

Your API should return products in one of these formats:

### Format 1: Array of Products
```json
[
  {
    "id": 1,
    "category": "Essentials",
    "name": "Oversized Hoodie",
    "price": "$185",
    "priceValue": 185,
    "description": "Premium oversized hoodie...",
    "image": "/images/hoodie.jpg"
  }
]
```

### Format 2: Object with Products Array
```json
{
  "products": [...],
  "total": 6
}
```

### Format 3: Object with Items Array
```json
{
  "items": [...],
  "count": 6
}
```

## API Endpoints Expected

- `GET /products` - Get all products
- `GET /products/:id` - Get single product by ID

## Field Mapping

The code automatically maps these field variations:
- `name` or `title` → `name`
- `image` or `imageUrl` or `thumbnail` → `image`
- `price` or `priceValue` → normalized price format

## Environment Variables

Add these to your `.env.local`:

```env
# Option 1: Use Next.js API route (recommended)
PRODUCTS_API_URL=https://your-api.com/api
PRODUCTS_API_KEY=your_api_key_here

# Option 2: Direct client-side API calls
NEXT_PUBLIC_PRODUCTS_API_URL=https://your-api.com/api
NEXT_PUBLIC_USE_PRODUCTS_API=true
PRODUCTS_API_KEY=your_api_key_here
```

## Fallback Behavior

- If API is not configured → Uses local data from `app/data/products.js`
- If API fails → Falls back to local data
- If API returns error → Shows error message with retry button

## Testing

1. **Test with local data (default):**
   - Don't set any API environment variables
   - App will use `app/data/products.js`

2. **Test with API:**
   - Set `PRODUCTS_API_URL` in `.env.local`
   - Restart your dev server
   - Products will be fetched from your API

3. **Test API route:**
   - Visit `http://localhost:3000/api/products`
   - Should return JSON array of products

## Customization

### Custom API Response Format

Edit `app/lib/products.js` to transform your API response:

```javascript
// In getProducts() function, modify the mapping:
return products.map(product => ({
  id: product.id,
  category: product.category || product.type || 'Essentials',
  name: product.name || product.title || product.productName,
  // ... customize as needed
}))
```

### Add Authentication

The code already supports Bearer token authentication. Just set:
```env
PRODUCTS_API_KEY=your_bearer_token
```

### Add Custom Headers

Edit `app/lib/products.js` to add custom headers:

```javascript
headers: {
  'Content-Type': 'application/json',
  'X-Custom-Header': 'value',
  ...(process.env.PRODUCTS_API_KEY && {
    'Authorization': `Bearer ${process.env.PRODUCTS_API_KEY}`,
  }),
}
```

## Troubleshooting

1. **Products not loading:**
   - Check browser console for errors
   - Verify API URL is correct
   - Check network tab for API requests
   - Ensure CORS is enabled on your API

2. **API errors:**
   - Check server logs
   - Verify API key is correct
   - Check API endpoint URLs

3. **Fallback to local data:**
   - Check console logs for "Falling back to local product data"
   - Verify environment variables are set correctly
   - Restart dev server after changing `.env.local`

