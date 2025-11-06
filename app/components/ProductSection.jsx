'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import QuickAddButton from './QuickAddButton'
import './ProductSection.css'

// Price ranges
const priceRanges = [
  { label: 'Under $100', min: 0, max: 99 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200 - $300', min: 200, max: 300 },
  { label: 'Over $300', min: 300, max: Infinity }
]

export default function ProductSection() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedPriceRange, setSelectedPriceRange] = useState(null)

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch from Next.js API route (which can proxy to external API)
        const response = await fetch('/api/products')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`)
        }
        
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching products:', err)
        setError(err.message)
        // Fallback to empty array - you could also import local products here
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Get unique categories from products
  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category))].filter(Boolean)
  }, [products])

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const togglePriceRange = (range) => {
    setSelectedPriceRange(prev => prev === range ? null : range)
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedPriceRange(null)
  }

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Filter by category
      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
        return false
      }

      // Filter by price range
      if (selectedPriceRange) {
        const price = product.priceValue || parseFloat(product.price?.replace('$', '') || 0)
        if (price < selectedPriceRange.min || price > selectedPriceRange.max) {
          return false
        }
      }

      return true
    })
  }, [products, selectedCategories, selectedPriceRange])

  const activeFilterCount = selectedCategories.length + (selectedPriceRange ? 1 : 0)

  if (loading) {
    return (
      <section className="product-section" id="products">
        <div className="section-header">
          <h2>Essentials</h2>
        </div>
        <div className="loading-state">
          <p>Loading products...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="product-section" id="products">
        <div className="section-header">
          <h2>Essentials</h2>
        </div>
        <div className="error-state">
          <p>Error loading products: {error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="product-section" id="products">
      <div className="section-header">
        <h2>Essentials</h2>
        <button 
          className={`filter-btn ${filterOpen ? 'active' : ''}`}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          Filter {activeFilterCount > 0 && `(${activeFilterCount})`} {filterOpen ? '−' : '+'}
        </button>
      </div>

      {filterOpen && categories.length > 0 && (
        <div className="filter-panel">
          <div className="filter-section">
            <h3>Category</h3>
            <div className="filter-options">
              {categories.map(category => (
                <label key={category} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Price Range</h3>
            <div className="filter-options">
              {priceRanges.map((range, index) => (
                <label key={index} className="filter-radio">
                  <input
                    type="radio"
                    name="price-range"
                    checked={selectedPriceRange === range}
                    onChange={() => togglePriceRange(range)}
                  />
                  <span>{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear All Filters
            </button>
          )}
        </div>
      )}
      
      <div className="product-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <div key={product.id} className="product-card-wrapper">
              <Link 
                href={`/product/${product.id}`} 
                className="product-card"
              >
                <div className="product-image">
                  {product.image && product.image !== '/placeholder.jpg' ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <div className="placeholder-img"></div>
                  )}
                </div>
                <div className="product-info">
                  <div className="product-category">{product.category}</div>
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">{product.price}</div>
                </div>
              </Link>
              <QuickAddButton product={product} />
            </div>
          ))
        ) : (
          <div className="no-products">
            <p>No products found matching your filters.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
