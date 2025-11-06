# Order Storage Configuration Guide

This guide explains how to configure order storage to S3 or Database after successful payments.

## Overview

After a successful payment (Stripe or test mode), the system automatically stores order details. You can configure it to store in:
- **S3** - AWS S3 bucket
- **Database** - External database API
- **Internal** - Internal storage (default, via admin panel)

## Configuration

### Option 1: AWS S3 Storage

Store orders as JSON files in an S3 bucket.

**Environment Variables:**
```env
ORDER_STORAGE_TYPE=s3
NEXT_PUBLIC_ORDER_STORAGE_TYPE=s3

AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
```

**Setup Steps:**
1. Create an S3 bucket in AWS
2. Create an IAM user with S3 write permissions
3. Get access key ID and secret access key
4. Add credentials to `.env.local`
5. Orders will be stored at: `s3://your-bucket/orders/{orderId}/{timestamp}.json`

**S3 File Structure:**
```
your-bucket/
  orders/
    pi_1234567890/
      2025-01-15T10-30-00-000Z.json
```

### Option 2: Database API Storage

Store orders via an external database API.

**Environment Variables:**
```env
ORDER_STORAGE_TYPE=database
NEXT_PUBLIC_ORDER_STORAGE_TYPE=database

DATABASE_API_URL=https://your-database-api.com/orders
DATABASE_API_KEY=your_api_key_here  # Optional
```

**Database API Requirements:**
Your database API should accept POST requests with:
- **Endpoint:** `DATABASE_API_URL`
- **Method:** POST
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {DATABASE_API_KEY}` (if provided)
- **Body:** Order JSON object

**Expected Response:**
```json
{
  "id": "database_order_id",
  "orderId": "pi_1234567890",
  "success": true
}
```

### Option 3: Internal Storage (Default)

Orders are stored internally and accessible via admin panel.

**Environment Variables:**
```env
ORDER_STORAGE_TYPE=internal
NEXT_PUBLIC_ORDER_STORAGE_TYPE=internal
# Or leave unset (defaults to internal)
```

Orders are stored in memory and can be retrieved via `/api/admin/orders`.

## How It Works

1. **Payment Succeeds** → Stripe webhook or test mode simulation
2. **Order Data Prepared** → Complete order object with customer info, items, totals
3. **Storage API Called** → `/api/orders/store` endpoint
4. **Storage Type Determined** → From `ORDER_STORAGE_TYPE` or request
5. **Order Stored** → In S3, Database, or Internal storage
6. **Success Logged** → Console logs confirm storage

## Order Data Structure

Every order includes:

```json
{
  "orderId": "pi_1234567890",
  "paymentIntentId": "pi_1234567890",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "shipping": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "customer@example.com",
    "phone": "1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "items": [
    {
      "id": "item-1",
      "name": "Product Name",
      "price": "$50.00",
      "quantity": 2,
      "category": "Category"
    }
  ],
  "subtotal": 100.00,
  "shippingCost": 10.00,
  "total": 110.00,
  "currency": "usd",
  "status": "completed",
  "paymentStatus": "succeeded",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "isTestMode": false
}
```

## Testing

### Test Mode:
1. Set `STRIPE_TEST_MODE=true`
2. Complete a test payment
3. Check console logs for: `✅ Order stored successfully`
4. Verify order in:
   - S3: Check your S3 bucket
   - Database: Check your database API
   - Internal: Visit `/admin` panel

### Production:
1. Configure storage type and credentials
2. Complete a real payment
3. Verify order is stored correctly

## Error Handling

- **Storage failures don't affect payment** - Payment succeeds even if storage fails
- **Errors are logged** - Check console for detailed error messages
- **Graceful degradation** - Falls back to internal storage if configured storage fails

## Security Considerations

### S3:
- Use IAM roles with minimal permissions
- Enable bucket encryption
- Use bucket policies to restrict access
- Rotate access keys regularly

### Database API:
- Use HTTPS for API endpoints
- Implement API key authentication
- Validate and sanitize order data
- Use rate limiting

## Troubleshooting

### Orders Not Storing in S3

1. **Check AWS Credentials:**
   ```bash
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_SECRET_ACCESS_KEY
   ```

2. **Verify Bucket Name:**
   ```bash
   echo $AWS_S3_BUCKET
   ```

3. **Check IAM Permissions:**
   - User needs `s3:PutObject` permission
   - Bucket policy should allow writes

4. **Check Console Logs:**
   - Look for S3 storage errors
   - Verify order data is being sent

### Orders Not Storing in Database

1. **Check API URL:**
   ```bash
   echo $DATABASE_API_URL
   ```

2. **Test API Endpoint:**
   ```bash
   curl -X POST $DATABASE_API_URL \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $DATABASE_API_KEY" \
     -d '{"test": true}'
   ```

3. **Verify API Response:**
   - API should return success status
   - Check API logs for errors

### Storage Type Not Working

1. **Verify Environment Variables:**
   - Check `.env.local` file
   - Restart dev server after changes
   - Ensure both `ORDER_STORAGE_TYPE` and `NEXT_PUBLIC_ORDER_STORAGE_TYPE` match

2. **Check Storage Type Value:**
   - Must be exactly: `s3`, `database`, or `internal`
   - Case-sensitive

3. **Check Console Logs:**
   - Look for storage type detection messages
   - Verify correct storage handler is called

## Next Steps

1. Choose your storage type (S3, Database, or Internal)
2. Configure environment variables
3. Test with a payment
4. Verify orders are being stored
5. Set up monitoring/alerts for storage failures

