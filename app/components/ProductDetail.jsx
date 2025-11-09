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
      envSupabaseUrl: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'N/A (server)'
    })
    
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
      primaryUrl = constructSupabaseUrl(firstImage, bucket, supabaseUrl) || firstImage
      
      if (product.images.length > 1) {
        const secondImage = product.images[1]
        secondaryUrl = constructSupabaseUrl(secondImage, bucket, supabaseUrl) || secondImage
      }
    } else if (product.image && product.image !== '/placeholder.jpg') {
      // Fallback: construct public URL from path
      primaryUrl = constructSupabaseUrl(product.image, bucket, supabaseUrl) || product.image
      
      // Check if image field has comma-separated paths for secondary image
      if (product.image.includes(',')) {
        const paths = product.image.split(',').map(p => p.trim()).filter(Boolean)
        if (paths.length > 1) {
          secondaryUrl = constructSupabaseUrl(paths[1], bucket, supabaseUrl) || paths[1]
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
      productName: product.name
    })
  }

  // Ensure we have a valid URL (not null, undefined, or empty string)
  const hasValidPrimaryUrl = primaryUrl && primaryUrl.trim() !== ''

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
                  src={primaryUrl} 
                  alt={product.name}
                  className="product-detail-image-primary"
                  loading="lazy"
                  onError={(e) => handleImageError(e, 'Primary')}
                  onLoad={() => console.log('[ProductDetail] Primary image loaded successfully:', primaryUrl)}
                />
                {secondaryUrl && secondaryUrl.trim() !== '' && (
                  <img 
                    src={secondaryUrl} 
                    alt={`${product.name} - view 2`}
                    className="product-detail-image-secondary"
                    loading="lazy"
                    onError={(e) => handleImageError(e, 'Secondary')}
                    onLoad={() => console.log('[ProductDetail] Secondary image loaded successfully:', secondaryUrl)}
                  />
                )}
              </>
            ) : (
              <div className="placeholder-img-large"></div>
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

