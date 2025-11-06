import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { isTestModeEnabled, createMockPaymentIntent, validateTestModeConfig } from '../../lib/stripe-test-mode'

// Only initialize Stripe if not in test mode
// Check test mode at module level to avoid initializing Stripe unnecessarily
const isTestMode = isTestModeEnabled()

// Initialize Stripe only if not in test mode
let stripe = null
if (!isTestMode) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY not set. Stripe will not work in production mode.')
  }
  stripe = new Stripe(stripeKey || '', {
    apiVersion: '2024-11-20.acacia',
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount, currency, shipping, items } = body

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Check test mode (check again in case env vars changed)
    const currentTestMode = isTestModeEnabled()
    
    // Debug logging
    console.log('🔍 Test mode check:', {
      STRIPE_TEST_MODE: process.env.STRIPE_TEST_MODE,
      NEXT_PUBLIC_STRIPE_TEST_MODE: process.env.NEXT_PUBLIC_STRIPE_TEST_MODE,
      isTestModeEnabled: currentTestMode
    })

    // In test mode, return mock payment intent without calling Stripe
    if (currentTestMode) {
      validateTestModeConfig()
      console.log('⚠️  [TEST MODE] Creating mock payment intent')
      
      const mockPaymentIntent = createMockPaymentIntent(amount, currency, shipping, items)
      
      return NextResponse.json({
        clientSecret: mockPaymentIntent.client_secret,
        testMode: true,
        paymentIntentId: mockPaymentIntent.id
      })
    }

    // Production mode: Check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Production mode: Create real payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency || 'usd',
      metadata: {
        shipping: JSON.stringify(shipping),
        items: JSON.stringify(items),
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

