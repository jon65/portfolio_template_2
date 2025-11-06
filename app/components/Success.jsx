'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import './Success.css'

function Success() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId') || 'N/A'
  const shippingParam = searchParams.get('shipping')
  const shippingInfo = shippingParam ? JSON.parse(decodeURIComponent(shippingParam)) : null

  return (
    <div className="success-container">
      <div className="success-content">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed</h1>
        <p className="success-message">
          Thank you for your purchase! Your order has been confirmed.
        </p>
        <div className="order-details">
          <p><strong>Order ID:</strong> {orderId}</p>
          {shippingInfo && (
            <div className="shipping-details">
              <p><strong>Shipping to:</strong></p>
              <p>
                {shippingInfo.firstName} {shippingInfo.lastName}<br />
                {shippingInfo.address}<br />
                {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}
              </p>
            </div>
          )}
        </div>
        <div className="success-actions">
          <Link href="/" className="continue-shopping-button">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Success

