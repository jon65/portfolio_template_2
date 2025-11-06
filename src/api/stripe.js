// Stripe API helper functions
// This file contains helper functions for Stripe integration

/**
 * Create a payment intent on your backend
 * You'll need to create a backend endpoint that calls Stripe's API
 * 
 * Example backend endpoint (Node.js/Express):
 * 
 * app.post('/api/create-payment-intent', async (req, res) => {
 *   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
 *   
 *   try {
 *     const paymentIntent = await stripe.paymentIntents.create({
 *       amount: req.body.amount,
 *       currency: req.body.currency || 'usd',
 *       metadata: {
 *         shipping: JSON.stringify(req.body.shipping),
 *         items: JSON.stringify(req.body.items)
 *       }
 *     });
 *     
 *     res.json({ clientSecret: paymentIntent.client_secret });
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 */

export const createPaymentIntent = async (amount, currency, shipping, items) => {
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'usd',
      shipping,
      items
    })
  })

  if (!response.ok) {
    throw new Error('Failed to create payment intent')
  }

  return response.json()
}

/**
 * Alternative: Use Stripe Checkout (redirect-based, simpler)
 * This doesn't require as much custom backend code
 * 
 * Example backend endpoint:
 * 
 * app.post('/api/create-checkout-session', async (req, res) => {
 *   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
 *   
 *   const session = await stripe.checkout.sessions.create({
 *     payment_method_types: ['card'],
 *     line_items: req.body.items.map(item => ({
 *       price_data: {
 *         currency: 'usd',
 *         product_data: {
 *           name: item.name,
 *         },
 *         unit_amount: item.priceValue * 100,
 *       },
 *       quantity: item.quantity,
 *     })),
 *     mode: 'payment',
 *     success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
 *     cancel_url: `${req.headers.origin}/cart`,
 *     shipping_address_collection: {
 *       allowed_countries: ['US', 'CA', 'GB', 'AU'],
 *     },
 *   });
 *   
 *   res.json({ sessionId: session.id });
 * });
 */

export const createCheckoutSession = async (items) => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items })
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}

