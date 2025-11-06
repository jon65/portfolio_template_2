 'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'
import './Cart.css'

function Cart() {
  const router = useRouter()
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart()

  const handleCheckout = () => {
    router.push('/checkout')
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <h1 className="cart-title">Your Cart</h1>
        <div className="cart-empty">
          <p>Your cart is empty</p>
          <button onClick={() => router.push('/')} className="shop-button">
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-container">
      <h1 className="cart-title">Your Cart</h1>
      
      <div className="cart-content">
        <div className="cart-items">
          {cartItems.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-image">
                <div className="placeholder-img-small"></div>
              </div>
              
              <div className="cart-item-info">
                <h3 className="cart-item-name">{item.name}</h3>
                <div className="cart-item-category">{item.category}</div>
                <div className="cart-item-price">{item.price}</div>
              </div>
              
              <div className="cart-item-controls">
                <div className="quantity-controls">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    −
                  </button>
                  <span className="quantity-value">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="remove-button"
                >
                  Remove
                </button>
              </div>
              
              <div className="cart-item-total">
                ${(parseFloat(item.price.replace('$', '')) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${getCartTotal().toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>${getCartTotal().toFixed(2)}</span>
          </div>
          
          <button onClick={handleCheckout} className="checkout-button">
            Proceed to Checkout
          </button>
          
          <button onClick={clearCart} className="clear-cart-button">
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cart

