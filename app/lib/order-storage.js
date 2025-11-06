// Hybrid storage: Use database if available, fallback to in-memory storage
import {
  storeOrderInDatabase,
  updateOrderStatusInDatabase,
  getOrdersFromDatabase,
  getOrderMetricsFromDatabase,
  isDatabaseAvailable,
} from './order-storage-db'

// In-memory storage for orders (fallback when database is not available)
let ordersStorage = []

/**
 * Store order (database if available, otherwise in-memory)
 */
export async function storeOrderInMemory(orderData) {
  // Set default order status if not present
  if (!orderData.orderStatus) {
    orderData.orderStatus = 'ordered'
  }
  
  // Try database first if available
  if (isDatabaseAvailable()) {
    try {
      return await storeOrderInDatabase(orderData)
    } catch (error) {
      console.error('Database storage failed, falling back to in-memory:', error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  if (!orderData.createdAt) {
    orderData.createdAt = new Date().toISOString()
  }
  
  ordersStorage.push(orderData)
  console.log(`Order stored in memory: ${orderData.orderId} (${ordersStorage.length} total orders)`)
  
  return {
    success: true,
    orderId: orderData.orderId,
    stored: true
  }
}

/**
 * Update order status (database if available, otherwise in-memory)
 */
export async function updateOrderStatus(orderId, newStatus) {
  // Try database first if available
  if (isDatabaseAvailable()) {
    try {
      return await updateOrderStatusInDatabase(orderId, newStatus)
    } catch (error) {
      console.error('Database update failed, falling back to in-memory:', error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  const orderIndex = ordersStorage.findIndex(order => order.orderId === orderId)
  
  if (orderIndex === -1) {
    return { success: false, error: 'Order not found' }
  }
  
  ordersStorage[orderIndex].orderStatus = newStatus
  ordersStorage[orderIndex].statusUpdatedAt = new Date().toISOString()
  
  return {
    success: true,
    orderId,
    orderStatus: newStatus
  }
}

/**
 * Get orders (database if available, otherwise from memory)
 */
export async function getOrdersFromMemory(options = {}) {
  // Try database first if available
  if (isDatabaseAvailable()) {
    try {
      return await getOrdersFromDatabase(options)
    } catch (error) {
      console.error('Database query failed, falling back to in-memory:', error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  const { orderId, limit = 100, offset = 0, testMode, orderStatus } = options
  
  let orders = [...ordersStorage]
  
  // Filter by orderId if provided
  if (orderId) {
    orders = orders.filter(order => order.orderId === orderId)
  }
  
  // Filter test mode orders if requested
  if (testMode === false) {
    orders = orders.filter(order => !order.isTestMode)
  } else if (testMode === true) {
    orders = orders.filter(order => order.isTestMode)
  }
  
  // Filter by order status if provided
  if (orderStatus) {
    orders = orders.filter(order => order.orderStatus === orderStatus)
  }
  
  // Sort by createdAt (newest first)
  orders.sort((a, b) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return dateB - dateA
  })
  
  // Paginate
  const paginatedOrders = orders.slice(offset, offset + limit)
  
  return {
    orders: paginatedOrders,
    total: orders.length,
    limit,
    offset,
    hasMore: offset + limit < orders.length
  }
}

/**
 * Get order metrics (database if available, otherwise from memory)
 */
export async function getOrderMetrics(options = {}) {
  // Try database first if available
  if (isDatabaseAvailable()) {
    try {
      return await getOrderMetricsFromDatabase(options)
    } catch (error) {
      console.error('Database metrics query failed, falling back to in-memory:', error)
      // Fall through to in-memory storage
    }
  }
  
  // Fallback to in-memory storage
  const { testMode } = options
  
  let orders = [...ordersStorage]
  
  // Filter test mode orders if requested
  if (testMode === false) {
    orders = orders.filter(order => !order.isTestMode)
  } else if (testMode === true) {
    orders = orders.filter(order => order.isTestMode)
  }
  
  // Calculate metrics
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
  
  // Status breakdown
  const statusCounts = {
    ordered: 0,
    couriered: 0,
    delivered: 0
  }
  
  orders.forEach(order => {
    const status = order.orderStatus || 'ordered'
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++
    }
  })
  
  return {
    totalOrders,
    totalRevenue,
    statusCounts,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
  }
}

