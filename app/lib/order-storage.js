// In-memory storage for orders (replace with database in production)
// This is a simple in-memory store. In production, use a database.
let ordersStorage = []

/**
 * Store order in memory (for internal storage)
 * In production, replace with database operations
 */
export function storeOrderInMemory(orderData) {
  // Add timestamp if not present
  if (!orderData.createdAt) {
    orderData.createdAt = new Date().toISOString()
  }
  
  // Set default order status if not present
  if (!orderData.orderStatus) {
    orderData.orderStatus = 'ordered'
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
 * Update order status
 */
export function updateOrderStatus(orderId, newStatus) {
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
 * Get orders from memory
 * In production, replace with database query
 */
export function getOrdersFromMemory(options = {}) {
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
 * Get order metrics
 */
export function getOrderMetrics(options = {}) {
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

