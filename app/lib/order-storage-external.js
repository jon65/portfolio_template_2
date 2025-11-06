/**
 * Order Storage Utilities
 * 
 * Functions to store orders in S3 or Database after successful payment
 */

/**
 * Store order in S3 or Database
 * 
 * @param {Object} orderData - Complete order data object
 * @returns {Promise<Object>} Result object with success status
 */
export async function storeOrder(orderData) {
  const storageType = process.env.ORDER_STORAGE_TYPE || 'internal' // 's3', 'database', or 'internal'
  
  try {
    switch (storageType) {
      case 's3':
        return await storeOrderInS3(orderData)
      case 'database':
        return await storeOrderInDatabase(orderData)
      case 'internal':
      default:
        // Already handled by admin panel integration
        return { success: true, message: 'Order stored internally' }
    }
  } catch (error) {
    console.error('Error storing order:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Store order in AWS S3
 */
async function storeOrderInS3(orderData) {
  const s3Bucket = process.env.AWS_S3_BUCKET
  const s3Region = process.env.AWS_S3_REGION || 'us-east-1'
  
  if (!s3Bucket) {
    throw new Error('AWS_S3_BUCKET environment variable not set')
  }

  // Create S3 key (path) for the order
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const s3Key = `orders/${orderData.orderId}/${timestamp}.json`

  // Prepare order JSON
  const orderJson = JSON.stringify(orderData, null, 2)

  // Call API route to handle S3 upload (server-side)
  const response = await fetch('/api/orders/store', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storageType: 's3',
      orderData,
      s3Key,
      s3Bucket,
      s3Region
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to store order in S3')
  }

  const result = await response.json()
  
  return {
    success: true,
    orderId: orderData.orderId,
    s3Key: result.s3Key,
    s3Url: result.s3Url
  }
}

/**
 * Store order in Database
 */
async function storeOrderInDatabase(orderData) {
  const dbApiUrl = process.env.DATABASE_API_URL
  
  if (!dbApiUrl) {
    throw new Error('DATABASE_API_URL environment variable not set')
  }

  // Call API route to handle database storage
  const response = await fetch('/api/orders/store', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      storageType: 'database',
      orderData
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to store order in database')
  }

  const result = await response.json()
  
  return {
    success: true,
    orderId: orderData.orderId,
    databaseId: result.databaseId
  }
}

