# Admin Panel Integration Guide

This guide explains how orders are automatically sent to your admin panel after successful Stripe payments, supporting both test and production environments.

## Overview

When a payment succeeds (via Stripe webhook), the system automatically:
1. Sends order details to your admin panel
2. Works in both test mode and production mode
3. Supports external admin panel APIs or internal storage

## Configuration Options

### Option 1: External Admin Panel API (Recommended)

If you have a separate admin panel system, configure it to receive orders via API:

**Environment Variables:**
```env
ADMIN_PANEL_API_URL=https://your-admin-panel.com/api/orders
ADMIN_PANEL_API_KEY=your_api_key_here  # Optional but recommended
```

**What Happens:**
- Order data is sent via POST request to your admin panel API
- Includes complete order details (customer info, items, shipping, totals)
- Uses Bearer token authentication if `ADMIN_PANEL_API_KEY` is set

**Expected API Format:**
Your admin panel should accept POST requests with this format:
```json
{
  "order": {
    "orderId": "pi_1234567890",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "items": [...],
    "shipping": {...},
    "subtotal": 50.00,
    "shippingCost": 10.00,
    "total": 60.00,
    "status": "completed",
    "paymentStatus": "succeeded",
    "isTestMode": false,
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "stripe-webhook"
}
```

### Option 2: Internal Storage (Default)

If no external admin panel URL is configured, orders are stored internally:

**Environment Variables:**
```env
# Leave ADMIN_PANEL_API_URL unset or empty
INTERNAL_API_KEY=your_internal_key  # Optional, for securing API
ADMIN_API_KEY=your_admin_key        # For retrieving orders
```

**What Happens:**
- Orders are stored in memory (replace with database in production)
- Can be retrieved via GET `/api/admin/orders`
- Perfect for development and simple admin panels

## Retrieving Orders

### GET `/api/admin/orders`

Retrieve stored orders from internal storage:

**Request:**
```bash
GET /api/admin/orders?limit=50&offset=0&testMode=false
```

**Headers:**
```
Authorization: Bearer your_admin_api_key
# OR
X-Admin-API-Key: your_admin_api_key
```

**Query Parameters:**
- `orderId` (optional) - Get specific order by ID
- `limit` (optional, default: 100) - Number of orders to return
- `offset` (optional, default: 0) - Pagination offset
- `testMode` (optional) - Filter: `true` (only test), `false` (only real), omit (all)

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "pi_1234567890",
      "customerEmail": "customer@example.com",
      "customerName": "John Doe",
      "items": [...],
      "shipping": {...},
      "total": 60.00,
      "status": "completed",
      "isTestMode": false,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

## Test Mode Support

The admin panel integration works seamlessly in test mode:

- **Test Mode Orders**: Marked with `isTestMode: true`
- **Filtering**: Use `testMode=false` query param to exclude test orders
- **Email Notifications**: Admin emails clearly marked as TEST MODE
- **External APIs**: Test orders still sent to external admin panel (if configured)

## Production Setup

### For External Admin Panel:

1. Set `ADMIN_PANEL_API_URL` to your production admin panel endpoint
2. Set `ADMIN_PANEL_API_KEY` for authentication
3. Ensure your admin panel API is publicly accessible
4. Test with a real Stripe payment

### For Internal Storage:

1. **Replace in-memory storage with database:**
   - Edit `app/lib/order-storage.js`
   - Replace `storeOrderInMemory()` with database insert
   - Replace `getOrdersFromMemory()` with database query

2. **Example MongoDB implementation:**
```javascript
// In app/lib/order-storage.js
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)

export async function storeOrderInDatabase(orderData) {
  await client.connect()
  const db = client.db('your-database')
  await db.collection('orders').insertOne(orderData)
  await client.close()
}

export async function getOrdersFromDatabase(options) {
  await client.connect()
  const db = client.db('your-database')
  const query = {}
  if (options.orderId) query.orderId = options.orderId
  if (options.testMode !== undefined) query.isTestMode = options.testMode
  
  const orders = await db.collection('orders')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .skip(options.offset)
    .toArray()
  
  await client.close()
  return { orders, ... }
}
```

3. **Update API route:**
   - Edit `app/api/admin/orders/route.js`
   - Replace storage function calls with database functions

## Order Data Structure

Every order includes:

```typescript
{
  orderId: string              // Stripe payment intent ID
  paymentIntentId: string      // Same as orderId
  customerEmail: string        // Customer email address
  customerName: string         // Full name
  shipping: {                  // Shipping address
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  items: Array<{              // Order items
    id: string
    name: string
    price: string
    quantity: number
    category: string
  }>
  subtotal: number            // Subtotal before shipping
  shippingCost: number        // Shipping cost (usually 10.00)
  total: number               // Total amount
  currency: string            // Currency code (e.g., "usd")
  status: string             // Order status ("completed")
  paymentStatus: string       // Payment status ("succeeded")
  isTestMode: boolean         // true if test mode order
  createdAt: Date            // Order creation timestamp
}
```

## Error Handling

The system is designed to be resilient:

- **Admin Panel Failures**: If sending to admin panel fails, the order processing continues
- **Logging**: All errors are logged to console
- **Non-Blocking**: Admin panel failures don't affect payment success
- **Retry Logic**: Consider implementing retry logic in production

## Testing

### Test Mode:
1. Set `STRIPE_TEST_MODE=true` in `.env.local`
2. Complete a test payment
3. Check console logs for "Order sent to admin panel successfully"
4. Verify order appears in admin panel (or internal storage)

### Production:
1. Use Stripe test card: `4242 4242 4242 4242`
2. Complete a test payment
3. Verify order sent to admin panel
4. Check admin panel received the order

## Security Considerations

1. **API Keys**: Always use API keys for external admin panels
2. **HTTPS**: Use HTTPS for all admin panel API calls
3. **Rate Limiting**: Implement rate limiting on admin panel endpoints
4. **Validation**: Validate order data in your admin panel
5. **Authentication**: Use strong authentication for order retrieval endpoints

## Troubleshooting

### Orders Not Appearing in Admin Panel

1. **Check Environment Variables:**
   ```bash
   echo $ADMIN_PANEL_API_URL
   echo $ADMIN_PANEL_API_KEY
   ```

2. **Check Server Logs:**
   - Look for "Order sent to admin panel successfully"
   - Check for error messages

3. **Test API Endpoint:**
   ```bash
   curl -X POST https://your-admin-panel.com/api/orders \
     -H "Authorization: Bearer your_key" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

4. **Check Internal Storage:**
   ```bash
   curl http://localhost:3000/api/admin/orders \
     -H "X-Admin-API-Key: your_key"
   ```

### Test Mode Orders Not Filtered

- Ensure `isTestMode` field is set correctly
- Check query parameter: `?testMode=false`
- Verify order metadata includes `test_mode: 'true'`

## Next Steps

1. Configure your admin panel endpoint (or use internal storage)
2. Test with a payment (test mode recommended first)
3. Verify orders are received/stored correctly
4. Set up database storage for production
5. Implement admin panel UI to display orders

