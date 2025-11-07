'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook to fetch a product by ID using Prisma (via API)
 * @param {string|number} productId - The ID of the product to fetch
 * @returns {Object} - { product, loading, error }
 */
export function useProductById(productId) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const id = typeof productId === 'string' ? productId : productId?.toString()
        const response = await fetch(`/api/products?id=${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setProduct(null)
            setError('Product not found')
          } else {
            throw new Error(`Failed to fetch product: ${response.statusText}`)
          }
        } else {
          const data = await response.json()
          setProduct(data)
        }
      } catch (err) {
        console.error('Error fetching product:', err)
        setError(err.message)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  return { product, loading, error }
}

