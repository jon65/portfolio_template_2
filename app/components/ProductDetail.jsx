'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { getProductById } from '../data/products'
import { useCart } from '../context/CartContext'
import './ProductDetail.css'

function ProductDetail({ params }) {
  const router = useRouter()
  const product = getProductById(params.id)
  const { addToCart } = useCart()

  if (!product) {
    return (
      <div className="product-detail-container">
        <div className="product-not-found">
          <h2>Product not found</h2>
          <button onClick={() => router.push('/')} className="back-button">
            Return to Shop
          </button>
        </div>
      </div>
    )
  }

  const handleAddToCart = () => {
    addToCart(product)
    // Optional: Show notification or navigate to cart
  }

  return (
    <div className="product-detail-container">
      <button onClick={() => router.back()} className="back-button">
        ← Back
      </button>
      
      <div className="product-detail">
        <div className="product-detail-image">
          <div className="placeholder-img-large"></div>
        </div>
        
        <div className="product-detail-info">
          <div className="product-detail-category">{product.category}</div>
          <h1 className="product-detail-name">{product.name}</h1>
          <div className="product-detail-price">{product.price}</div>
          <p className="product-detail-description">{product.description}</p>
          
          <button 
            onClick={handleAddToCart} 
            className="add-to-cart-button"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail

