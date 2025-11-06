import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { storeOrderInMemory } from '../../../lib/order-storage'

/**
 * POST /api/orders/store
 * Store order in S3 or Database
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { storageType, orderData } = body

    // Ensure orderStatus is set
    if (!orderData.orderStatus) {
      orderData.orderStatus = 'ordered'
    }

    // Determine storage type from request or environment variable
    const finalStorageType = storageType || process.env.ORDER_STORAGE_TYPE || 'internal'

    if (finalStorageType === 's3') {
      // Generate S3 key if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const s3Key = `orders/${orderData.orderId}/${timestamp}.json`
      const s3Bucket = process.env.AWS_S3_BUCKET
      const s3Region = process.env.AWS_S3_REGION || 'us-east-1'
      
      const s3Result = await handleS3Storage(orderData, s3Key, s3Bucket, s3Region)
      
      // Also store internally for admin panel
      storeOrderInMemory(orderData)
      
      return s3Result
    } else if (finalStorageType === 'database') {
      const dbResult = await handleDatabaseStorage(orderData)
      
      // Also store internally for admin panel
      storeOrderInMemory(orderData)
      
      return dbResult
    } else {
      // Internal storage (default) - store in memory
      const result = storeOrderInMemory(orderData)
      return NextResponse.json({
        success: true,
        orderId: orderData.orderId,
        message: 'Order stored internally',
        stored: result.stored
      })
    }
  } catch (error) {
    console.error('Error storing order:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Handle S3 storage
 */
async function handleS3Storage(orderData, s3Key, s3Bucket, s3Region) {
  try {
    // Check if AWS credentials and bucket are configured
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      return NextResponse.json(
        { error: 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY' },
        { status: 500 }
      )
    }

    if (!s3Bucket) {
      return NextResponse.json(
        { error: 'AWS_S3_BUCKET not configured' },
        { status: 500 }
      )
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    })

    // Convert order data to JSON string
    const orderJson = JSON.stringify(orderData, null, 2)

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: orderJson,
      ContentType: 'application/json',
      Metadata: {
        'order-id': orderData.orderId,
        'order-date': new Date(orderData.createdAt).toISOString(),
      },
    })

    await s3Client.send(command)

    // Construct S3 URL
    const s3Url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${s3Key}`

    console.log(`Order stored in S3: ${s3Url}`)

    return NextResponse.json({
      success: true,
      orderId: orderData.orderId,
      s3Key,
      s3Url,
      message: 'Order stored successfully in S3'
    })
  } catch (error) {
    console.error('S3 storage error:', error)
    return NextResponse.json(
      { error: `S3 storage failed: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * Handle Database storage
 */
async function handleDatabaseStorage(orderData) {
  try {
    const dbApiUrl = process.env.DATABASE_API_URL
    const dbApiKey = process.env.DATABASE_API_KEY

    if (!dbApiUrl) {
      return NextResponse.json(
        { error: 'DATABASE_API_URL not configured' },
        { status: 500 }
      )
    }

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    }

    if (dbApiKey) {
      headers['Authorization'] = `Bearer ${dbApiKey}`
    }

    // Send order to database API
    const response = await fetch(dbApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Database API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    console.log(`Order stored in database: ${orderData.orderId}`)

    return NextResponse.json({
      success: true,
      orderId: orderData.orderId,
      databaseId: result.id || result.orderId,
      message: 'Order stored successfully in database'
    })
  } catch (error) {
    console.error('Database storage error:', error)
    return NextResponse.json(
      { error: `Database storage failed: ${error.message}` },
      { status: 500 }
    )
  }
}

