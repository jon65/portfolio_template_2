import { NextResponse } from 'next/server'
import { storeOrderInMemory, getOrdersFromMemory, getOrderMetrics } from '../../../lib/order-storage'

/**
 * POST /api/admin/orders
 * Store a new order (called internally after successful payment)
 */
export async function POST(request) {
  try {
    // Optional: Verify internal API key
    const apiKey = request.headers.get('X-Internal-API-Key')
    if (process.env.INTERNAL_API_KEY && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const orderData = await request.json()

    // Validate required fields
    if (!orderData.orderId || !orderData.customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and customerEmail' },
        { status: 400 }
      )
    }

    // Store order (in production, save to database)
    const result = await storeOrderInMemory(orderData)

    // In production, replace with:
    // const db = await connectDatabase()
    // await db.orders.insertOne(orderData)

    return NextResponse.json({
      success: true,
      orderId: orderData.orderId,
      message: 'Order stored successfully',
      storedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error storing order:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/orders
 * Retrieve all orders (for admin panel)
 */
export async function GET(request) {
  try {
    // Optional: Verify admin API key
    const apiKey = request.headers.get('X-Admin-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    if (process.env.ADMIN_API_KEY && apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const testModeParam = searchParams.get('testMode')
    const includeMetrics = searchParams.get('includeMetrics') === 'true'
    
    // Convert testMode string to boolean
    const testMode = testModeParam === 'true' ? true : testModeParam === 'false' ? false : undefined

    // Get orders from storage
    const result = await getOrdersFromMemory({ orderId, limit, offset, testMode })

    // Include metrics if requested
    const response = {
      success: true,
      ...result
    }

    if (includeMetrics) {
      response.metrics = await getOrderMetrics({ testMode })
    }

    // In production, replace with database query:
    // const db = await connectDatabase()
    // const query = {}
    // if (orderId) query.orderId = orderId
    // if (testMode !== undefined) query.isTestMode = testMode
    // const orders = await db.orders
    //   .find(query)
    //   .sort({ createdAt: -1 })
    //   .limit(limit)
    //   .skip(offset)
    //   .toArray()

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error retrieving orders:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
