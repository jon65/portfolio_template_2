'use client'

import React from 'react'
import { useCart } from '../context/CartContext'

function QuickAddButton({ product }) {
  const { addToCart } = useCart()

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
  }

  return (
    <button 
      className="quick-add-button"
      onClick={handleAddToCart}
    >
      Quick Add
    </button>
  )
}

export default QuickAddButton



