// Email utility functions for sending invoices
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Generate HTML email template for order invoice
 */
function generateInvoiceEmail(orderData) {
  const { orderId, customerEmail, customerName, shipping, items, subtotal, shippingCost, total, date } = orderData

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Your Brand</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-family: 'Playfair Display', serif;
    }
    .email-body {
      padding: 40px 30px;
    }
    .order-confirmation {
      text-align: center;
      margin-bottom: 40px;
    }
    .order-confirmation h2 {
      color: #1a1a1a;
      font-size: 28px;
      margin: 0 0 10px 0;
      font-weight: 400;
    }
    .order-confirmation p {
      color: #666;
      margin: 0;
    }
    .order-info {
      background-color: #f9f9f9;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #e5e5e5;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #666;
      font-weight: 500;
    }
    .info-value {
      color: #1a1a1a;
    }
    .items-section {
      margin-bottom: 30px;
    }
    .items-section h3 {
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-name {
      font-weight: 500;
      color: #1a1a1a;
    }
    .item-details {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .item-price {
      color: #1a1a1a;
      font-weight: 500;
    }
    .total-section {
      border-top: 2px solid #1a1a1a;
      padding-top: 20px;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .total-row.final {
      font-size: 20px;
      font-weight: 600;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e5e5e5;
    }
    .shipping-section {
      background-color: #f9f9f9;
      padding: 20px;
      margin-top: 30px;
      border: 1px solid #e5e5e5;
    }
    .shipping-section h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      color: #1a1a1a;
    }
    .shipping-address {
      color: #666;
      line-height: 1.8;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .email-footer p {
      color: #666;
      font-size: 12px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Your Brand</h1>
    </div>
    
    <div class="email-body">
      <div class="order-confirmation">
        <h2>Order Confirmed</h2>
        <p>Thank you for your purchase!</p>
      </div>

      <div class="order-info">
        <div class="info-row">
          <span class="info-label">Order ID:</span>
          <span class="info-value">${orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Order Date:</span>
          <span class="info-value">${date}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${customerEmail}</span>
        </div>
      </div>

      <div class="items-section">
        <h3>Order Items</h3>
        ${items.map(item => `
          <div class="item-row">
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-details">${item.category} × ${item.quantity}</div>
            </div>
            <div class="item-price">$${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Shipping</span>
          <span>$${shippingCost.toFixed(2)}</span>
        </div>
        <div class="total-row final">
          <span>Total</span>
          <span>$${total.toFixed(2)}</span>
        </div>
      </div>

      ${shipping ? `
      <div class="shipping-section">
        <h3>Shipping Address</h3>
        <div class="shipping-address">
          ${shipping.firstName} ${shipping.lastName}<br>
          ${shipping.address}<br>
          ${shipping.city}, ${shipping.state} ${shipping.zipCode}<br>
          ${shipping.country}
        </div>
      </div>
      ` : ''}
    </div>

    <div class="email-footer">
      <p>© 2025 Your Brand. All Rights Reserved.</p>
      <p>If you have any questions, please contact us at support@yourbrand.com</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send invoice email to customer after successful payment
 */
export async function sendInvoiceEmail(paymentIntent) {
  try {
    // Parse metadata from payment intent
    const shipping = paymentIntent.metadata.shipping 
      ? JSON.parse(paymentIntent.metadata.shipping) 
      : null
    const items = paymentIntent.metadata.items 
      ? JSON.parse(paymentIntent.metadata.items) 
      : []

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price.replace('$', ''))
      return sum + (price * item.quantity)
    }, 0)
    const shippingCost = 10.00 // Fixed shipping cost
    const total = (paymentIntent.amount / 100) // Amount from Stripe is in cents

    // Get customer email from shipping info or payment intent
    const customerEmail = shipping?.email || paymentIntent.receipt_email
    const customerName = shipping 
      ? `${shipping.firstName} ${shipping.lastName}` 
      : 'Customer'

    if (!customerEmail) {
      console.error('No email found for payment intent:', paymentIntent.id)
      return { success: false, error: 'No email address found' }
    }

    // Format order date
    const orderDate = new Date(paymentIntent.created * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Prepare email data
    const emailData = {
      orderId: paymentIntent.id,
      customerEmail,
      customerName,
      shipping,
      items,
      subtotal,
      shippingCost,
      total,
      date: orderDate
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Your Brand <onboarding@resend.dev>',
      to: customerEmail,
      subject: `Order Confirmation #${paymentIntent.id.slice(-8)}`,
      html: generateInvoiceEmail(emailData),
    })

    if (error) {
      console.error('Error sending invoice email:', error)
      return { success: false, error: error.message }
    }

    console.log('Invoice email sent successfully:', data)
    return { success: true, emailId: data?.id }
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate HTML email template for admin order notification
 */
function generateAdminNotificationEmail(orderData) {
  const { orderId, customerEmail, customerName, shipping, items, subtotal, shippingCost, total, date, isTestMode } = orderData

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Notification - Your Brand</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 400;
      letter-spacing: 4px;
      text-transform: uppercase;
      font-family: 'Playfair Display', serif;
    }
    ${isTestMode ? `
    .test-mode-banner {
      background-color: #ff9800;
      color: #ffffff;
      padding: 15px;
      text-align: center;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    ` : ''}
    .email-body {
      padding: 40px 30px;
    }
    .order-notification {
      text-align: center;
      margin-bottom: 40px;
    }
    .order-notification h2 {
      color: #1a1a1a;
      font-size: 28px;
      margin: 0 0 10px 0;
      font-weight: 400;
    }
    .order-notification p {
      color: #666;
      margin: 0;
    }
    .order-info {
      background-color: #f9f9f9;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #e5e5e5;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #666;
      font-weight: 500;
    }
    .info-value {
      color: #1a1a1a;
      font-weight: 600;
    }
    .items-section {
      margin-bottom: 30px;
    }
    .items-section h3 {
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-name {
      font-weight: 500;
      color: #1a1a1a;
    }
    .item-details {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .item-price {
      color: #1a1a1a;
      font-weight: 500;
    }
    .total-section {
      border-top: 2px solid #1a1a1a;
      padding-top: 20px;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .total-row.final {
      font-size: 24px;
      font-weight: 600;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e5e5e5;
      color: #1a1a1a;
    }
    .shipping-section {
      background-color: #f9f9f9;
      padding: 20px;
      margin-top: 30px;
      border: 1px solid #e5e5e5;
    }
    .shipping-section h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      color: #1a1a1a;
    }
    .shipping-address {
      color: #666;
      line-height: 1.8;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .email-footer p {
      color: #666;
      font-size: 12px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Your Brand</h1>
    </div>
    ${isTestMode ? '<div class="test-mode-banner">⚠️ TEST MODE - This is a test order</div>' : ''}
    
    <div class="email-body">
      <div class="order-notification">
        <h2>New Order Received</h2>
        <p>You have received a new order that requires processing</p>
      </div>

      <div class="order-info">
        <div class="info-row">
          <span class="info-label">Order ID:</span>
          <span class="info-value">${orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Order Date:</span>
          <span class="info-value">${date}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Customer Email:</span>
          <span class="info-value">${customerEmail}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Customer Name:</span>
          <span class="info-value">${customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Order Total:</span>
          <span class="info-value">$${total.toFixed(2)}</span>
        </div>
      </div>

      <div class="items-section">
        <h3>Order Items</h3>
        ${items.map(item => `
          <div class="item-row">
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-details">${item.category} × ${item.quantity}</div>
            </div>
            <div class="item-price">$${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Shipping</span>
          <span>$${shippingCost.toFixed(2)}</span>
        </div>
        <div class="total-row final">
          <span>Total</span>
          <span>$${total.toFixed(2)}</span>
        </div>
      </div>

      ${shipping ? `
      <div class="shipping-section">
        <h3>Shipping Address</h3>
        <div class="shipping-address">
          ${shipping.firstName} ${shipping.lastName}<br>
          ${shipping.email ? `${shipping.email}<br>` : ''}
          ${shipping.phone ? `${shipping.phone}<br>` : ''}
          ${shipping.address}<br>
          ${shipping.city}, ${shipping.state} ${shipping.zipCode}<br>
          ${shipping.country}
        </div>
      </div>
      ` : ''}
    </div>

    <div class="email-footer">
      <p>© 2025 Your Brand. All Rights Reserved.</p>
      <p>This is an automated notification. Please process this order in your admin panel.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send admin notification email when a new order is received
 */
export async function sendAdminNotification(paymentIntent, isTestMode = false) {
  try {
    // Get admin email from environment variable
    const adminEmail = process.env.ADMIN_EMAIL
    
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not set. Skipping admin notification.')
      return { success: false, error: 'ADMIN_EMAIL not configured' }
    }

    // Parse metadata from payment intent
    const shipping = paymentIntent.metadata?.shipping 
      ? JSON.parse(paymentIntent.metadata.shipping) 
      : null
    const items = paymentIntent.metadata?.items 
      ? JSON.parse(paymentIntent.metadata.items) 
      : []

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price.replace('$', ''))
      return sum + (price * item.quantity)
    }, 0)
    const shippingCost = 10.00 // Fixed shipping cost
    const total = (paymentIntent.amount / 100) // Amount from Stripe is in cents

    // Get customer email from shipping info or payment intent
    const customerEmail = shipping?.email || paymentIntent.receipt_email || 'N/A'
    const customerName = shipping 
      ? `${shipping.firstName} ${shipping.lastName}` 
      : 'Customer'

    // Format order date
    const orderDate = new Date((paymentIntent.created || Date.now() / 1000) * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Prepare email data
    const emailData = {
      orderId: paymentIntent.id,
      customerEmail,
      customerName,
      shipping,
      items,
      subtotal,
      shippingCost,
      total,
      date: orderDate,
      isTestMode
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Your Brand <onboarding@resend.dev>',
      to: adminEmail,
      subject: `${isTestMode ? '[TEST MODE] ' : ''}New Order #${paymentIntent.id.slice(-8)} - $${total.toFixed(2)}`,
      html: generateAdminNotificationEmail(emailData),
    })

    if (error) {
      console.error('Error sending admin notification:', error)
      return { success: false, error: error.message }
    }

    console.log('Admin notification sent successfully:', data)
    return { success: true, emailId: data?.id }
  } catch (error) {
    console.error('Error in sendAdminNotification:', error)
    return { success: false, error: error.message }
  }
}

