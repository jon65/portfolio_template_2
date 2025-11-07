import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { storeOrderInMemory } from '../../../lib/order-storage'
import { storeOrderInDatabase } from '../../../lib/order-storage-db'

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
      
      // Also store internally for admin panel (in-memory fallback)
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
 * Handle Database storage using Prisma (Supabase)
 */
async function handleDatabaseStorage(orderData) {
  try {
    // Check if DATABASE_URL is configured (required for Prisma)
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured. Please set DATABASE_URL in your environment variables.' },
        { status: 500 }
      )
    }

    // Ensure orderStatus is set before storing
    if (!orderData.orderStatus) {
      orderData.orderStatus = 'ordered'
    }

    // Use Prisma to store order in Supabase
    const result = await storeOrderInDatabase(orderData)

    console.log(`Order stored in Supabase via Prisma: ${orderData.orderId} (Database ID: ${result.id})`)

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      databaseId: result.id,
      message: 'Order stored successfully in Supabase database'
    })
  } catch (error) {
    console.error('Database storage error:', error)
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: `Order with ID ${orderData.orderId} already exists in database` },
        { status: 409 }
      )
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid data: Referenced record does not exist' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: `Database storage failed: ${error.message}` },
      { status: 500 }
    )
  }
}

