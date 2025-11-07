import { NextResponse } from 'next/server'
import { storeOrderInMemory, getOrdersFromMemory, getOrderMetrics } from '../../../lib/order-storage'
import { 
  getOrdersFromDatabase, 
  getOrderMetricsFromDatabase,
  isDatabaseAvailable 
} from '../../../lib/order-storage-db'

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
 * Transform order from database format to admin panel format
 * Handles both database format (with shippingInfo) and memory format (with shipping)
 */
function transformOrderForAdmin(order) {
  // If order already has customerName and shipping, it's likely from memory - just ensure paymentStatus
  if (order.customerName && order.shipping && !order.shippingInfo) {
    return {
      ...order,
      paymentStatus: order.paymentStatus || (order.paymentIntentId ? 'paid' : 'pending'),
    }
  }

  // Construct customerName from shippingInfo, shipping, or firstName/lastName
  let customerName = order.customerName
  if (!customerName) {
    if (order.shippingInfo) {
      customerName = `${order.shippingInfo.firstName || ''} ${order.shippingInfo.lastName || ''}`.trim()
    } else if (order.shipping) {
      customerName = `${order.shipping.firstName || ''} ${order.shipping.lastName || ''}`.trim()
    } else if (order.customerFirstName && order.customerLastName) {
      customerName = `${order.customerFirstName} ${order.customerLastName}`
    }
    customerName = customerName || 'Customer'
  }

  // Map shippingInfo to shipping for admin panel compatibility
  let shipping = order.shipping
  if (!shipping) {
    if (order.shippingInfo) {
      shipping = order.shippingInfo
    } else if (order.customerFirstName) {
      shipping = {
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
        phone: order.customerPhone,
        email: order.customerEmail,
        address: order.shippingAddress,
        city: order.shippingCity,
        state: order.shippingState,
        zipCode: order.shippingZipCode,
        country: order.shippingCountry,
      }
    }
  }

  // Determine payment status based on paymentIntentId
  const paymentStatus = order.paymentStatus || (order.paymentIntentId ? 'paid' : 'pending')

  return {
    ...order,
    customerName,
    shipping,
    paymentStatus,
  }
}

/**
 * GET /api/admin/orders
 * Retrieve all orders (for admin panel)
 */
export async function GET(request) {
  try {
    // Verify authentication
    const { requireAuth } = await import('../../lib/auth')
    try {
      await requireAuth()
    } catch (error) {
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

    // Get orders from database if available, otherwise fallback to memory
    let result
    if (isDatabaseAvailable()) {
      try {
        result = await getOrdersFromDatabase({ orderId, limit, offset, testMode })
        // Transform orders to match admin panel expectations
        result.orders = result.orders.map(transformOrderForAdmin)
      } catch (error) {
        console.error('Database query failed, falling back to memory:', error)
        result = await getOrdersFromMemory({ orderId, limit, offset, testMode })
        // Transform memory orders too to ensure consistent format
        result.orders = result.orders.map(transformOrderForAdmin)
      }
    } else {
      result = await getOrdersFromMemory({ orderId, limit, offset, testMode })
      // Transform memory orders to ensure consistent format
      result.orders = result.orders.map(transformOrderForAdmin)
    }

    // Include metrics if requested
    const response = {
      success: true,
      ...result
    }

    if (includeMetrics) {
      if (isDatabaseAvailable()) {
        try {
          response.metrics = await getOrderMetricsFromDatabase({ testMode })
        } catch (error) {
          console.error('Database metrics query failed, falling back to memory:', error)
          response.metrics = await getOrderMetrics({ testMode })
        }
      } else {
        response.metrics = await getOrderMetrics({ testMode })
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error retrieving orders:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
