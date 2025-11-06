/**
 * Stripe Test Mode Utilities
 * 
 * This module provides test mode functionality to simulate Stripe payments
 * without making actual API calls. Useful for development and testing.
 * 
 * Enable test mode by setting STRIPE_TEST_MODE=true in your .env.local file
 */

/**
 * Check if test mode is enabled
 */
export function isTestModeEnabled() {
  return process.env.STRIPE_TEST_MODE === 'true' || process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'
}

/**
 * Generate a mock payment intent response
 */
export function createMockPaymentIntent(amount, currency, shipping, items) {
  const paymentIntentId = `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const clientSecret = `pi_test_${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`
  
  return {
    id: paymentIntentId,
    object: 'payment_intent',
    amount: Math.round(amount),
    currency: currency || 'usd',
    status: 'succeeded',
    client_secret: clientSecret,
    created: Math.floor(Date.now() / 1000),
    metadata: {
      shipping: JSON.stringify(shipping),
      items: JSON.stringify(items),
      test_mode: 'true'
    },
    receipt_email: shipping?.email || null,
    // Mock other Stripe payment intent fields
    payment_method: `pm_test_${Math.random().toString(36).substr(2, 9)}`,
    charges: {
      data: [{
        id: `ch_test_${Math.random().toString(36).substr(2, 9)}`,
        amount: Math.round(amount),
        currency: currency || 'usd',
        status: 'succeeded',
        paid: true
      }]
    }
  }
}

/**
 * Simulate Stripe payment confirmation (always succeeds in test mode)
 */
export function simulatePaymentConfirmation(clientSecret) {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      const paymentIntentId = clientSecret.split('_secret_')[0]
      resolve({
        paymentIntent: {
          id: paymentIntentId,
          status: 'succeeded',
          amount: 0, // Will be set from the original payment intent
          currency: 'usd',
          created: Math.floor(Date.now() / 1000),
          metadata: {
            test_mode: 'true'
          }
        },
        error: null
      })
    }, 500) // Simulate 500ms delay
  })
}

/**
 * Create a mock webhook event for testing
 */
export function createMockWebhookEvent(paymentIntent, eventType = 'payment_intent.succeeded') {
  return {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    object: 'event',
    type: eventType,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: paymentIntent
    }
  }
}

/**
 * Validate test mode configuration
 */
export function validateTestModeConfig() {
  if (isTestModeEnabled()) {
    console.log('⚠️  STRIPE TEST MODE ENABLED')
    console.log('   Stripe API calls will be simulated')
    console.log('   No actual payments will be processed')
    return true
  }
  return false
}

