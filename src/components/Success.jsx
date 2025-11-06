import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import './Success.css'

function Success() {
  const location = useLocation()
  const orderId = location.state?.orderId || 'N/A'
  const shippingInfo = location.state?.shippingInfo

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
          <Link to="/" className="continue-shopping-button">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Success

