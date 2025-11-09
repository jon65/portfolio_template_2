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
  const [imageErrors, setImageErrors] = useState({}) // Track which product images failed to load

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)
        // Clear any previous image errors when fetching new products
        setImageErrors({})
        // Fetch from Next.js API route (which can proxy to external API)
        const response = await fetch('/api/products')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`)
        }
        
        const data = await response.json()
        const productsList = Array.isArray(data) ? data : []
        console.log('productsList', productsList);
        setProducts(productsList)
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

  // Handle image load error
  const handleImageError = (productId, imageUrl) => {
    console.error(`[ProductSection] Image failed to load for product ${productId}:`, imageUrl)
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }))
  }

  // Helper function to convert a path to a full Supabase URL
  const constructSupabaseUrl = (path, bucket = 'product-images', supabaseUrlFromProduct = null) => {
    if (!path) return null
    
    // If already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    // If it's a local path (starts with /), don't convert
    if (path.startsWith('/')) {
      return null
    }
    
    // Get Supabase URL from product data (from API) or environment variable
    const supabaseUrl = supabaseUrlFromProduct || process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!supabaseUrl) {
      console.error(`[ProductSection] NEXT_PUBLIC_SUPABASE_URL not available! Cannot construct URL for path: ${path}`)
      console.error(`[ProductSection] Available env vars:`, Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')))
      return null
    }
    
    // Construct full public URL
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
    
    console.log(`[ProductSection] Constructed URL: ${fullUrl} from path: ${path}`)
    return fullUrl
  }

  // Get image URLs for a product (returns primary and secondary)
  // Memoized to prevent URL changes on every render
  const getProductImageUrls = useMemo(() => {
    const urlCache = new Map()
    
    return (product) => {
      // Use cache key based on product data to prevent unnecessary recalculations
      const cacheKey = `${product.id}-${product.imageUrl || product.image}-${product.imageUrls?.length || 0}`
      
      if (urlCache.has(cacheKey)) {
        return urlCache.get(cacheKey)
      }
      
      let primaryUrl = null
      let secondaryUrl = null
      const bucket = product.imageBucket || 'product-images'
      // Get Supabase URL from product data (passed from API) or fallback to env var
      const supabaseUrl = product._supabaseUrl || null
      
      // Priority: imageUrls array > imageUrl > constructed URL from path
      if (product.imageUrls && product.imageUrls.length > 0) {
        // Check if imageUrls contain paths or full URLs
        const firstUrl = product.imageUrls[0]
        primaryUrl = constructSupabaseUrl(firstUrl, bucket, supabaseUrl) || firstUrl
        
        if (product.imageUrls.length > 1) {
          const secondUrl = product.imageUrls[1]
          secondaryUrl = constructSupabaseUrl(secondUrl, bucket, supabaseUrl) || secondUrl
        }
      } else if (product.imageUrl) {
        // Check if imageUrl is a path or full URL
        primaryUrl = constructSupabaseUrl(product.imageUrl, bucket, supabaseUrl) || product.imageUrl
      } else if (product.image && product.image !== '/placeholder.jpg') {
        // Fallback: construct public URL from path
        primaryUrl = constructSupabaseUrl(product.image, bucket, supabaseUrl)
        
        // Check if image field has comma-separated paths for secondary image
        if (product.image.includes(',')) {
          const paths = product.image.split(',').map(p => p.trim()).filter(Boolean)
          if (paths.length > 1) {
            secondaryUrl = constructSupabaseUrl(paths[1], bucket, supabaseUrl)
          }
        }
      }
      
      const result = { primaryUrl, secondaryUrl }
      urlCache.set(cacheKey, result)
      
      console.log(`[ProductSection] Product ${product.id} image URLs:`, {
        primaryUrl,
        secondaryUrl,
        isFullUrl: primaryUrl?.startsWith('http'),
        isPath: primaryUrl?.startsWith('/'),
        productImageUrl: product.imageUrl,
        productImage: product.image
      })
      
      return result
    }
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
                  {(() => {
                    const { primaryUrl, secondaryUrl } = getProductImageUrls(product)
                    const hasError = imageErrors[product.id]
                    
                    if (!primaryUrl) {
                      return <div className="placeholder-img"></div>
                    }
                    
                    // Only show error if we have an error state AND the URL hasn't changed
                    // This prevents showing error for a URL that might have been fixed
                    if (hasError) {
                      // Check if the URL has changed since the error (product might have been updated)
                      const currentUrl = primaryUrl
                      // If error exists, show error message but also try to load the image
                      // This allows recovery if the URL was fixed
                      return (
                        <>
                          <img 
                            key={`product-${product.id}-error-${primaryUrl}`}
                            src={primaryUrl} 
                            alt={product.name}
                            className="product-image-primary"
                            onLoad={(event) => {
                              // Image loaded successfully, clear the error
                              console.log(`[ProductSection] Image loaded successfully for product ${product.id}, clearing error`, {
                                url: primaryUrl,
                                naturalWidth: event.target.naturalWidth,
                                naturalHeight: event.target.naturalHeight
                              })
                              setImageErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors[product.id]
                                return newErrors
                              })
                            }}
                            onError={(e) => {
                              const errorDetails = {
                                productId: product.id,
                                productName: product.name,
                                attemptedUrl: primaryUrl,
                                urlType: primaryUrl?.startsWith('http') ? 'full URL' : primaryUrl?.startsWith('/') ? 'local path' : 'relative path',
                                error: e,
                                target: e.target,
                                naturalWidth: e.target?.naturalWidth,
                                naturalHeight: e.target?.naturalHeight,
                                complete: e.target?.complete,
                                src: e.target?.src,
                                currentSrc: e.target?.currentSrc
                              }
                              console.error(`[ProductSection] Primary image error (error state):`, errorDetails)
                              console.error(`[ProductSection] Image element:`, e.target)
                              handleImageError(product.id, primaryUrl)
                            }}
                            loading="lazy"
                          />
                          {hasError && (
                            <div className="image-error">
                              <h3>Problem Retrieving Photo</h3>
                            </div>
                          )}
                        </>
                      )
                    }
                    
                    // Normal rendering - no error
                    return (
                      <>
                        <img 
                          key={`product-${product.id}-${primaryUrl}`}
                          src={primaryUrl} 
                          alt={product.name}
                          className="product-image-primary"
                          onLoad={(event) => {
                            // Ensure error is cleared if image loads successfully
                            console.log(`[ProductSection] Image loaded successfully for product ${product.id}`, {
                              url: primaryUrl,
                              naturalWidth: event.target.naturalWidth,
                              naturalHeight: event.target.naturalHeight
                            })
                            if (imageErrors[product.id]) {
                              setImageErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors[product.id]
                                return newErrors
                              })
                            }
                          }}
                          onError={(e) => {
                            const errorDetails = {
                              productId: product.id,
                              productName: product.name,
                              attemptedUrl: primaryUrl,
                              urlType: primaryUrl?.startsWith('http') ? 'full URL' : primaryUrl?.startsWith('/') ? 'local path' : 'relative path',
                              error: e,
                              target: e.target,
                              naturalWidth: e.target?.naturalWidth,
                              naturalHeight: e.target?.naturalHeight,
                              complete: e.target?.complete,
                              src: e.target?.src,
                              currentSrc: e.target?.currentSrc
                            }
                            console.error(`[ProductSection] Primary image error:`, errorDetails)
                            console.error(`[ProductSection] Image element:`, e.target)
                            handleImageError(product.id, primaryUrl)
                          }}
                          loading="lazy"
                        />
                        {secondaryUrl && (
                          <img 
                            src={secondaryUrl} 
                            alt={`${product.name} - view 2`}
                            className="product-image-secondary"
                            onError={(e) => {
                              // If secondary image fails, just hide it (don't show error)
                              console.warn(`[ProductSection] Secondary image failed for product ${product.id}:`, secondaryUrl)
                            }}
                            loading="lazy"
                          />
                        )}
                      </>
                    )
                  })()}
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
