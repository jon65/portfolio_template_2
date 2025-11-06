'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../context/CartContext'
import './Checkout.css'

// Check if test mode is enabled (client-side)
const isTestMode = process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === 'true'

// Initialize Stripe - Replace with your actual publishable key
// In Next.js, use process.env.NEXT_PUBLIC_ prefix for client-side variables
// In test mode, create a promise that resolves to null
const stripePromise = isTestMode 
  ? Promise.resolve(null) // Don't load Stripe in test mode
  : loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here')

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { cartItems, getCartTotal, clearCart } = useCart()
  
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  })
  
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Simulate webhook call in test mode
  const simulateWebhook = async (paymentIntentId, paymentIntent) => {
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-mode': 'true',
        },
        body: JSON.stringify({
          type: 'payment_intent.succeeded',
          data: {
            object: paymentIntent
          }
        })
      })
    } catch (err) {
      console.error('Failed to simulate webhook:', err)
      // Don't fail the payment if webhook simulation fails
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // In test mode, skip Stripe validation
    if (!isTestMode && (!stripe || !elements)) {
      return
    }

    setProcessing(true)
    setError(null)

    // Validate shipping info
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode']
    const missingFields = requiredFields.filter(field => !shippingInfo[field])
    
    if (missingFields.length > 0) {
      setError('Please fill in all required fields')
      setProcessing(false)
      return
    }

    try {
      // Create payment intent using Next.js API route
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round((getCartTotal() + 10) * 100), // Convert to cents (including shipping)
          currency: 'usd',
          shipping: shippingInfo,
          items: cartItems
        })
      })

      if (!response.ok) {
        throw new Error('Payment intent creation failed')
      }

      const { clientSecret, testMode, paymentIntentId } = await response.json()

      // TEST MODE: Simulate successful payment
      if (isTestMode || testMode) {
        console.log('⚠️  [TEST MODE] Simulating successful payment')
        
        // Create mock payment intent for webhook
        const mockPaymentIntent = {
          id: paymentIntentId || `pi_test_${Date.now()}`,
          amount: Math.round((getCartTotal() + 10) * 100),
          currency: 'usd',
          status: 'succeeded',
          created: Math.floor(Date.now() / 1000),
          metadata: {
            shipping: JSON.stringify(shippingInfo),
            items: JSON.stringify(cartItems),
            test_mode: 'true'
          },
          receipt_email: shippingInfo.email
        }

        // Simulate webhook call
        await simulateWebhook(mockPaymentIntent.id, mockPaymentIntent)

        // Store order in S3 or Database
        try {
          const orderData = {
            orderId: mockPaymentIntent.id,
            paymentIntentId: mockPaymentIntent.id,
            customerEmail: shippingInfo.email,
            customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
            shipping: shippingInfo,
            items: cartItems,
            subtotal: getCartTotal(),
            shippingCost: 10.00,
            total: getCartTotal() + 10,
            currency: 'usd',
            status: 'completed',
            paymentStatus: 'succeeded',
            orderStatus: 'ordered', // Default order status
            createdAt: new Date(),
            isTestMode: true
          }

          const storeResponse = await fetch('/api/orders/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storageType: process.env.NEXT_PUBLIC_ORDER_STORAGE_TYPE || 'internal',
              orderData
            })
          })

          if (storeResponse.ok) {
            const result = await storeResponse.json()
            console.log('✅ Order stored successfully:', result.message || 'Order stored')
          } else {
            const error = await storeResponse.json()
            console.warn('⚠️ Failed to store order:', error.error || 'Unknown error')
          }
        } catch (storeError) {
          console.error('❌ Error storing order:', storeError)
          // Don't fail payment if storage fails
        }

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        clearCart()
        router.push(`/success?orderId=${mockPaymentIntent.id}&shipping=${encodeURIComponent(JSON.stringify(shippingInfo))}`)
        return
      }

      // PRODUCTION MODE: Use real Stripe
      const cardElement = elements.getElement(CardElement)

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
            email: shippingInfo.email,
            phone: shippingInfo.phone,
            address: {
              line1: shippingInfo.address,
              city: shippingInfo.city,
              state: shippingInfo.state,
              postal_code: shippingInfo.zipCode,
              country: shippingInfo.country,
            },
          },
        },
      })

      if (confirmError) {
        setError(confirmError.message)
        setProcessing(false)
      } else if (paymentIntent.status === 'succeeded') {
        // Store order in S3 or Database
        try {
          const orderData = {
            orderId: paymentIntent.id,
            paymentIntentId: paymentIntent.id,
            customerEmail: shippingInfo.email,
            customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
            shipping: shippingInfo,
            items: cartItems,
            subtotal: getCartTotal(),
            shippingCost: 10.00,
            total: getCartTotal() + 10,
            currency: paymentIntent.currency || 'usd',
            status: 'completed',
            paymentStatus: 'succeeded',
            orderStatus: 'ordered', // Default order status
            createdAt: new Date(paymentIntent.created * 1000),
            isTestMode: false
          }

          const storeResponse = await fetch('/api/orders/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storageType: process.env.NEXT_PUBLIC_ORDER_STORAGE_TYPE || 'internal',
              orderData
            })
          })

          if (storeResponse.ok) {
            const result = await storeResponse.json()
            console.log('✅ Order stored successfully:', result.message || 'Order stored')
          } else {
            const error = await storeResponse.json()
            console.warn('⚠️ Failed to store order:', error.error || 'Unknown error')
          }
        } catch (storeError) {
          console.error('❌ Error storing order:', storeError)
          // Don't fail payment if storage fails
        }

        clearCart()
        router.push(`/success?orderId=${paymentIntent.id}&shipping=${encodeURIComponent(JSON.stringify(shippingInfo))}`)
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError('Payment processing failed. Please try again.')
      setProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1a1a1a',
        fontFamily: 'Inter, sans-serif',
        '::placeholder': {
          color: '#999',
        },
      },
      invalid: {
        color: '#fa755a',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="checkout-section">
        <h2>Shipping Information</h2>
        
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={shippingInfo.firstName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={shippingInfo.lastName}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={shippingInfo.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={shippingInfo.phone}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label>Address *</label>
          <input
            type="text"
            name="address"
            value={shippingInfo.address}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City *</label>
            <input
              type="text"
              name="city"
              value={shippingInfo.city}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>State *</label>
            <input
              type="text"
              name="state"
              value={shippingInfo.state}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Zip Code *</label>
            <input
              type="text"
              name="zipCode"
              value={shippingInfo.zipCode}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Country *</label>
          <select
            name="country"
            value={shippingInfo.country}
            onChange={handleInputChange}
            required
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
            <option value="AU">Australia</option>
          </select>
        </div>
      </div>

      <div className="checkout-section">
        <h2>Payment Information</h2>
        {isTestMode ? (
          <div className="form-group">
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <strong>⚠️ TEST MODE ENABLED</strong>
              <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                Payment will be simulated. No actual charge will occur.
              </p>
            </div>
            <div className="form-group">
              <label>Test Card (Any card number will work)</label>
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>Card Details *</label>
            <div className="card-element-wrapper">
              <CardElement options={cardElementOptions} />
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="checkout-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${getCartTotal().toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span>$10.00</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>${(getCartTotal() + 10).toFixed(2)}</span>
        </div>

        <button
          type="submit"
          disabled={(!isTestMode && !stripe) || processing}
          className="submit-button"
        >
          {processing ? 'Processing...' : `${isTestMode ? '[TEST] ' : ''}Pay $${(getCartTotal() + 10).toFixed(2)}`}
        </button>
      </div>
    </form>
  )
}

function Checkout() {
  const { cartItems } = useCart()
  const router = useRouter()

  if (cartItems.length === 0) {
    return (
      <div className="checkout-container">
        <div className="checkout-empty">
          <h2>Your cart is empty</h2>
          <button onClick={() => router.push('/')} className="shop-button">
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-container">
      <h1 className="checkout-title">Checkout</h1>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  )
}

export default Checkout

