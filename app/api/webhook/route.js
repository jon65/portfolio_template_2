import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sendInvoiceEmail, sendAdminNotification } from '../../lib/email'
import { isTestModeEnabled, createMockWebhookEvent } from '../../lib/stripe-test-mode'
import { processSuccessfulOrder, processFailedPayment } from '../../lib/order-processing'

// Only initialize Stripe if not in test mode
const isTestMode = isTestModeEnabled()
let stripe = null

if (!isTestMode) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set. Stripe webhooks will not work in production mode.')
  }
  stripe = new Stripe(stripeKey || '', {
    apiVersion: '2024-11-20.acacia',
  })
}

// Stripe webhook endpoint
// Configure this URL in your Stripe Dashboard: https://dashboard.stripe.com/webhooks
export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const isTestMode = isTestModeEnabled()

  // In test mode, allow webhook simulation without signature verification
  if (isTestMode && request.headers.get('x-test-mode') === 'true') {
    try {
      const testEvent = JSON.parse(body)
      const event = testEvent.type === 'payment_intent.succeeded' 
        ? createMockWebhookEvent(testEvent.data.object, testEvent.type)
        : testEvent
      
      // Process the test event
      return await processWebhookEvent(event)
    } catch (err) {
      console.error('Test webhook error:', err.message)
      return NextResponse.json(
        { error: `Test Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }
  }

  // Production mode: verify Stripe signature
  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  // Check if Stripe is initialized
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY or enable test mode.' },
      { status: 500 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  return await processWebhookEvent(event)
}

/**
 * Process webhook event (shared between test and production modes)
 */
async function processWebhookEvent(event) {

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      const isTestMode = isTestModeEnabled() || paymentIntent.metadata?.test_mode === 'true'
      
      console.log(`${isTestMode ? '[TEST MODE] ' : ''}Payment succeeded:`, paymentIntent.id)
      
      // Send invoice email to customer
      try {
        const emailResult = await sendInvoiceEmail(paymentIntent)
        if (emailResult.success) {
          console.log('Invoice email sent successfully for payment:', paymentIntent.id)
        } else {
          console.error('Failed to send invoice email:', emailResult.error)
        }
      } catch (emailError) {
        console.error('Error sending invoice email:', emailError)
        // Don't fail the webhook if email fails - payment is still successful
      }
      
      // Send admin notification
      try {
        const adminResult = await sendAdminNotification(paymentIntent, isTestMode)
        if (adminResult.success) {
          console.log('Admin notification sent successfully for payment:', paymentIntent.id)
        } else {
          console.warn('Failed to send admin notification:', adminResult.error)
          // Don't fail the webhook if admin notification fails
        }
      } catch (adminError) {
        console.error('Error sending admin notification:', adminError)
        // Don't fail the webhook if admin notification fails - payment is still successful
      }
      
      // Process successful order (save to database, update inventory, etc.)
      try {
        const orderResult = await processSuccessfulOrder(paymentIntent)
        if (orderResult.success) {
          console.log('Order processed successfully:', orderResult.orderId)
        } else {
          console.error('Failed to process order:', orderResult.error)
          // Log error but don't fail webhook - payment is still successful
        }
      } catch (orderError) {
        console.error('Error processing order:', orderError)
        // Don't fail the webhook if order processing fails - payment is still successful
      }
      
      break
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object
      console.log('Payment failed:', failedPayment.id)
      
      // Process failed payment
      try {
        const failedResult = await processFailedPayment(failedPayment)
        if (failedResult.success) {
          console.log('Failed payment processed:', failedResult.orderId)
        } else {
          console.error('Failed to process failed payment:', failedResult.error)
        }
      } catch (failedError) {
        console.error('Error processing failed payment:', failedError)
      }
      
      break
      
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

