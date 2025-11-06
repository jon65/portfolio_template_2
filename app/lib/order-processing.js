/**
 * Order Processing Utilities
 * 
 * This file contains functions to handle post-payment actions
 * such as saving orders to database, updating inventory, etc.
 */

/**
 * Process a successful order after payment
 * 
 * @param {Object} paymentIntent - Stripe payment intent object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result object with success status
 */
export async function processSuccessfulOrder(paymentIntent, options = {}) {
  try {
    const {
      id: orderId,
      amount,
      currency,
      metadata,
      receipt_email,
      created
    } = paymentIntent

    // Parse metadata
    const shipping = metadata?.shipping ? JSON.parse(metadata.shipping) : null
    const items = metadata?.items ? JSON.parse(metadata.items) : []
    const isTestMode = metadata?.test_mode === 'true'

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price.replace('$', ''))
      return sum + (price * item.quantity)
    }, 0)
    const shippingCost = 10.00 // Fixed shipping cost
    const total = amount / 100 // Convert from cents

    // Prepare order data
    const orderData = {
      orderId,
      paymentIntentId: orderId,
      customerEmail: shipping?.email || receipt_email,
      customerName: shipping ? `${shipping.firstName} ${shipping.lastName}` : 'Customer',
      shipping,
      items,
      subtotal,
      shippingCost,
      total,
      currency: currency || 'usd',
      status: 'completed',
      paymentStatus: 'succeeded',
      orderStatus: 'ordered', // Default order status
      createdAt: new Date(created * 1000),
      isTestMode
    }

    // Send order details to admin panel
    try {
      const adminPanelResult = await sendOrderToAdminPanel(orderData)
      if (adminPanelResult.success) {
        console.log('Order sent to admin panel successfully:', orderId)
      } else {
        console.warn('Failed to send order to admin panel:', adminPanelResult.error)
        // Don't fail order processing if admin panel fails
      }
    } catch (adminPanelError) {
      console.error('Error sending order to admin panel:', adminPanelError)
      // Don't fail order processing if admin panel fails
    }

    console.log('Order processed successfully:', orderId)
    
    return {
      success: true,
      orderId,
      orderData
    }
  } catch (error) {
    console.error('Error processing order:', error)
    return {
      success: false,
      error: error.message,
      orderId: paymentIntent.id
    }
  }
}

/**
 * Handle failed payment
 * 
 * @param {Object} paymentIntent - Stripe payment intent object
 * @returns {Promise<Object>} Result object
 */
export async function processFailedPayment(paymentIntent) {
  try {
    const orderId = paymentIntent.id
    
    // ============================================
    // ADD YOUR CUSTOM LOGIC HERE
    // ============================================
    
    // Example: Log failed payment
    // await logFailedPayment(paymentIntent)
    
    // Example: Send notification to admin
    // await notifyAdminOfFailedPayment(paymentIntent)
    
    // Example: Update order status in database
    // await updateOrderStatus(orderId, 'failed')

    console.log('Failed payment processed:', orderId)
    
    return {
      success: true,
      orderId
    }
  } catch (error) {
    console.error('Error processing failed payment:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Example: Save order to database (implement based on your database)
 */
async function saveOrderToDatabase(orderData) {
  // Example using a database library:
  // 
  // const db = await connectDatabase()
  // await db.orders.insertOne({
  //   orderId: orderData.orderId,
  //   customerEmail: orderData.customerEmail,
  //   customerName: orderData.customerName,
  //   items: orderData.items,
  //   total: orderData.total,
  //   shipping: orderData.shipping,
  //   status: orderData.status,
  //   createdAt: orderData.createdAt
  // })
  
  console.log('Would save to database:', orderData.orderId)
}

/**
 * Send order details to admin panel
 * Supports both external admin panel API and internal storage
 * 
 * @param {Object} orderData - Complete order data object
 * @returns {Promise<Object>} Result object with success status
 */
export async function sendOrderToAdminPanel(orderData) {
  try {
    const adminPanelUrl = process.env.ADMIN_PANEL_API_URL
    const adminPanelApiKey = process.env.ADMIN_PANEL_API_KEY
    
    // If external admin panel URL is configured, send to it
    if (adminPanelUrl) {
      return await sendToExternalAdminPanel(orderData, adminPanelUrl, adminPanelApiKey)
    }
    
    // Otherwise, store internally via API endpoint
    return await storeOrderInternally(orderData)
  } catch (error) {
    console.error('Error in sendOrderToAdminPanel:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send order to external admin panel API
 */
async function sendToExternalAdminPanel(orderData, adminPanelUrl, apiKey) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    }
    
    // Add API key if provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
      // Alternative: headers['X-API-Key'] = apiKey
    }
    
    const response = await fetch(adminPanelUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order: orderData,
        timestamp: new Date().toISOString(),
        source: 'stripe-webhook'
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Admin panel API error: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    
    return {
      success: true,
      orderId: orderData.orderId,
      adminPanelResponse: result
    }
  } catch (error) {
    console.error('Error sending to external admin panel:', error)
    return {
      success: false,
      error: error.message,
      orderId: orderData.orderId
    }
  }
}

/**
 * Store order internally (in-memory or database)
 */
async function storeOrderInternally(orderData) {
  try {
    // Import storage function dynamically to avoid circular dependencies
    const { storeOrderInMemory } = await import('./order-storage')
    
    // Store in memory (in production, replace with database call)
    const result = storeOrderInMemory(orderData)
    
    return {
      success: true,
      orderId: orderData.orderId,
      stored: true,
      result
    }
  } catch (error) {
    console.error('Error storing order internally:', error)
    return {
      success: false,
      error: error.message,
      orderId: orderData.orderId
    }
  }
}

/**
 * Example: Update inventory (implement based on your system)
 */
async function updateInventory(items) {
  // Example:
  // for (const item of items) {
  //   await decreaseInventory(item.id, item.quantity)
  // }
  
  console.log('Would update inventory for items:', items)
}

