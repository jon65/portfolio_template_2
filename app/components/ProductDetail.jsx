'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProductById } from '../hooks/useProductById'
import { useCart } from '../context/CartContext'
import './ProductDetail.css'

function ProductDetail({ params }) {
  const router = useRouter()
  const { product, loading, error } = useProductById(params.id)
  const { addToCart } = useCart()

  // Debug: Log component state
  console.log('[ProductDetail] Component render:', {
    productId: params.id,
    loading,
    error,
    hasProduct: !!product,
    product: product ? { id: product.id, name: product.name } : null
  })

  // Helper function to convert a path to a full Supabase URL
  const constructSupabaseUrl = (path, bucket = 'product-images', supabaseUrlFromProduct = null) => {
    if (!path) return null
    
    // If already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    // If it's a local path (starts with /), return as-is
    if (path.startsWith('/')) {
      return path
    }
    
    // Get Supabase URL from product data (from API) or environment variable
    const supabaseUrl = supabaseUrlFromProduct || process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!supabaseUrl) {
      console.error('[ProductDetail] constructSupabaseUrl: Supabase URL not available. Cannot construct URL for path:', path)
      return null
    }
    
    // Construct full public URL
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
    
    return fullUrl
  }

  // Get image URLs for the product (returns primary and secondary)
  const imageUrls = useMemo(() => {
    // This log will run every time useMemo executes (when product changes)
    console.log('[ProductDetail] useMemo executing, product:', product ? { id: product.id, name: product.name } : 'null')
    
    if (!product) {
      console.log('[ProductDetail] useMemo: No product, returning null URLs')
      return { primaryUrl: null, secondaryUrl: null }
    }
    
    let primaryUrl = null
    let secondaryUrl = null
    const bucket = product.imageBucket || 'product-images'
    const supabaseUrl = product._supabaseUrl || (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : null)
    
    console.log('[ProductDetail] Product data:', {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls,
      images: product.images,
      image: product.image,
      imageBucket: product.imageBucket,
      _supabaseUrl: product._supabaseUrl,
      envSupabaseUrl: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'N/A (server)',
      resolvedSupabaseUrl: supabaseUrl
    })
    
    // Warn if Supabase URL is not available and we need to construct URLs
    if (!supabaseUrl && (product.images || (product.image && product.image !== '/placeholder.jpg' && !product.image.startsWith('/') && !product.image.startsWith('http')))) {
      console.warn('[ProductDetail] Supabase URL not available, but product has Supabase storage paths. Image URLs may not be constructed correctly.')
    }
    
    // Priority: imageUrls array (server-enriched) > imageUrl (server-enriched) > images array > image field
    if (product.imageUrls && Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      // Server has already enriched with URLs - use them directly
      primaryUrl = product.imageUrls[0]
      if (product.imageUrls.length > 1) {
        secondaryUrl = product.imageUrls[1]
      }
    } else if (product.imageUrl) {
      // Server has enriched with single URL
      primaryUrl = product.imageUrl
    } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Has images array but not enriched - construct URLs
      const firstImage = product.images[0]
      primaryUrl = constructSupabaseUrl(firstImage, bucket, supabaseUrl)
      
      // Only use raw path as fallback if it's a local path (starts with /)
      if (!primaryUrl && firstImage && firstImage.startsWith('/')) {
        primaryUrl = firstImage
      }
      
      if (product.images.length > 1) {
        const secondImage = product.images[1]
        secondaryUrl = constructSupabaseUrl(secondImage, bucket, supabaseUrl)
        
        // Only use raw path as fallback if it's a local path (starts with /)
        if (!secondaryUrl && secondImage && secondImage.startsWith('/')) {
          secondaryUrl = secondImage
        }
      }
    } else if (product.image && product.image !== '/placeholder.jpg') {
      // Fallback: construct public URL from path
      primaryUrl = constructSupabaseUrl(product.image, bucket, supabaseUrl)
      
      // Only use raw path as fallback if it's a local path (starts with /)
      if (!primaryUrl && product.image && product.image.startsWith('/')) {
        primaryUrl = product.image
      }
      
      // Check if image field has comma-separated paths for secondary image
      if (product.image.includes(',')) {
        const paths = product.image.split(',').map(p => p.trim()).filter(Boolean)
        if (paths.length > 1) {
          secondaryUrl = constructSupabaseUrl(paths[1], bucket, supabaseUrl)
          
          // Only use raw path as fallback if it's a local path (starts with /)
          if (!secondaryUrl && paths[1] && paths[1].startsWith('/')) {
            secondaryUrl = paths[1]
          }
        }
      }
    }
    
    console.log('[ProductDetail] Final image URLs:', {
      primaryUrl,
      secondaryUrl,
      isFullUrl: primaryUrl?.startsWith('http'),
      isPath: primaryUrl?.startsWith('/'),
      hasPrimary: !!primaryUrl,
      hasSecondary: !!secondaryUrl
    })
    
    return { primaryUrl, secondaryUrl }
  }, [product])

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="product-loading">
          <h2>Loading product...</h2>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-container">
        <div className="product-not-found">
          <h2>Product not found</h2>
          {error && <p className="error-message">{error}</p>}
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

  const { primaryUrl, secondaryUrl } = imageUrls

  const handleImageError = (e, imageType) => {
    console.error(`[ProductDetail] ${imageType} image failed to load:`, {
      src: e.target.src,
      productId: product.id,
      productName: product.name,
      naturalWidth: e.target.naturalWidth,
      naturalHeight: e.target.naturalHeight,
      complete: e.target.complete,
      error: e.target.error
    })
    // Try to show what went wrong
    if (e.target.error) {
      console.error(`[ProductDetail] Image error details:`, e.target.error)
    }
  }

  const handleImageLoad = (imageType, url) => {
    console.log(`[ProductDetail] ${imageType} image loaded successfully:`, {
      url,
      timestamp: new Date().toISOString()
    })
  }

  // Ensure we have a valid URL (not null, undefined, or empty string)
  const hasValidPrimaryUrl = primaryUrl && primaryUrl.trim() !== ''

  console.log('[ProductDetail] Render state:', {
    hasValidPrimaryUrl,
    primaryUrl,
    secondaryUrl,
    productId: product.id
  })

  return (
    <div className="product-detail-container">
      <button onClick={() => router.back()} className="back-button">
        ← Back
      </button>
      
      <div className="product-detail">
        <div className="product-detail-image-wrapper">
          <div className="product-detail-image">
            {hasValidPrimaryUrl ? (
              <>
                <img 
                  key={`primary-${primaryUrl}`}
                  src={primaryUrl} 
                  alt={product.name}
                  className="product-detail-image-primary"
                  loading="eager"
                  onError={(e) => handleImageError(e, 'Primary')}
                  onLoad={(e) => {
                    handleImageLoad('Primary', primaryUrl)
                    console.log('[ProductDetail] Image element details:', {
                      naturalWidth: e.target.naturalWidth,
                      naturalHeight: e.target.naturalHeight,
                      width: e.target.width,
                      height: e.target.height,
                      complete: e.target.complete,
                      computedStyle: window.getComputedStyle(e.target)
                    })
                  }}
                />
                {secondaryUrl && secondaryUrl.trim() !== '' && (
                  <img 
                    key={`secondary-${secondaryUrl}`}
                    src={secondaryUrl} 
                    alt={`${product.name} - view 2`}
                    className="product-detail-image-secondary"
                    loading="lazy"
                    onError={(e) => handleImageError(e, 'Secondary')}
                    onLoad={() => handleImageLoad('Secondary', secondaryUrl)}
                  />
                )}
              </>
            ) : (
              <div className="placeholder-img-large">
                <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No image available
                </p>
              </div>
            )}
          </div>
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

