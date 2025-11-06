import { prisma } from './prisma'
import { OrderStatus } from '@prisma/client'

/**
 * Convert order status string to Prisma enum
 */
function toOrderStatus(status) {
  const statusMap = {
    'ordered': OrderStatus.ORDERED,
    'couriered': OrderStatus.COURIERED,
    'delivered': OrderStatus.DELIVERED,
  }
  return statusMap[status?.toLowerCase()] || OrderStatus.ORDERED
}

/**
 * Convert Prisma OrderStatus enum to string
 */
function fromOrderStatus(status) {
  const statusMap = {
    [OrderStatus.ORDERED]: 'ordered',
    [OrderStatus.COURIERED]: 'couriered',
    [OrderStatus.DELIVERED]: 'delivered',
  }
  return statusMap[status] || 'ordered'
}

/**
 * Transform order data from API format to Prisma format
 */
function transformOrderForDatabase(orderData) {
  return {
    orderId: orderData.orderId,
    paymentIntentId: orderData.paymentIntentId || orderData.paymentIntent?.id || null,
    customerEmail: orderData.customerEmail,
    customerFirstName: orderData.shippingInfo?.firstName || orderData.customerFirstName || '',
    customerLastName: orderData.shippingInfo?.lastName || orderData.customerLastName || '',
    customerPhone: orderData.shippingInfo?.phone || orderData.customerPhone || null,
    shippingAddress: orderData.shippingInfo?.address || orderData.shippingAddress || '',
    shippingCity: orderData.shippingInfo?.city || orderData.shippingCity || '',
    shippingState: orderData.shippingInfo?.state || orderData.shippingState || '',
    shippingZipCode: orderData.shippingInfo?.zipCode || orderData.shippingZipCode || '',
    shippingCountry: orderData.shippingInfo?.country || orderData.shippingCountry || 'US',
    items: orderData.items || [],
    subtotal: orderData.subtotal || orderData.total - (orderData.shippingCost || 10),
    shippingCost: orderData.shippingCost || 10,
    total: orderData.total,
    orderStatus: toOrderStatus(orderData.orderStatus),
    isTestMode: orderData.isTestMode || false,
  }
}

/**
 * Transform Prisma order to API format
 */
function transformOrderFromDatabase(order) {
  return {
    id: order.id,
    orderId: order.orderId,
    paymentIntentId: order.paymentIntentId,
    customerEmail: order.customerEmail,
    shippingInfo: {
      firstName: order.customerFirstName,
      lastName: order.customerLastName,
      phone: order.customerPhone,
      email: order.customerEmail,
      address: order.shippingAddress,
      city: order.shippingCity,
      state: order.shippingState,
      zipCode: order.shippingZipCode,
      country: order.shippingCountry,
    },
    items: order.items,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    orderStatus: fromOrderStatus(order.orderStatus),
    statusUpdatedAt: order.statusUpdatedAt?.toISOString() || null,
    isTestMode: order.isTestMode,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

/**
 * Store order in database using Prisma
 */
export async function storeOrderInDatabase(orderData) {
  try {
    const data = transformOrderForDatabase(orderData)
    
    const order = await prisma.order.create({
      data,
    })
    
    console.log(`Order stored in database: ${order.orderId} (ID: ${order.id})`)
    
    return {
      success: true,
      orderId: order.orderId,
      id: order.id,
      stored: true,
    }
  } catch (error) {
    console.error('Error storing order in database:', error)
    throw error
  }
}

/**
 * Update order status in database
 */
export async function updateOrderStatusInDatabase(orderId, newStatus) {
  try {
    const orderStatus = toOrderStatus(newStatus)
    
    const order = await prisma.order.update({
      where: { orderId },
      data: {
        orderStatus,
        statusUpdatedAt: new Date(),
      },
    })
    
    return {
      success: true,
      orderId: order.orderId,
      orderStatus: fromOrderStatus(order.orderStatus),
    }
  } catch (error) {
    if (error.code === 'P2025') {
      // Record not found
      return { success: false, error: 'Order not found' }
    }
    console.error('Error updating order status:', error)
    throw error
  }
}

/**
 * Get orders from database
 */
export async function getOrdersFromDatabase(options = {}) {
  try {
    const { orderId, limit = 100, offset = 0, testMode, orderStatus } = options
    
    const where = {}
    
    if (orderId) {
      where.orderId = orderId
    }
    
    if (testMode === false) {
      where.isTestMode = false
    } else if (testMode === true) {
      where.isTestMode = true
    }
    
    if (orderStatus) {
      where.orderStatus = toOrderStatus(orderStatus)
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ])
    
    return {
      orders: orders.map(transformOrderFromDatabase),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    }
  } catch (error) {
    console.error('Error retrieving orders from database:', error)
    throw error
  }
}

/**
 * Get order metrics from database
 */
export async function getOrderMetricsFromDatabase(options = {}) {
  try {
    const { testMode } = options
    
    const where = {}
    
    if (testMode === false) {
      where.isTestMode = false
    } else if (testMode === true) {
      where.isTestMode = true
    }
    
    const orders = await prisma.order.findMany({
      where,
      select: {
        total: true,
        orderStatus: true,
      },
    })
    
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0)
    
    const statusCounts = {
      ordered: 0,
      couriered: 0,
      delivered: 0,
    }
    
    orders.forEach(order => {
      const status = fromOrderStatus(order.orderStatus)
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++
      }
    })
    
    return {
      totalOrders,
      totalRevenue,
      statusCounts,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    }
  } catch (error) {
    console.error('Error getting order metrics from database:', error)
    throw error
  }
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable() {
  return !!process.env.DATABASE_URL
}

