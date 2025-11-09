// Server-side product data fetching
// Supports Prisma/Supabase database, external API, and fallback to local data

import { prisma } from './prisma'
import { products as localProducts, getProductById as getLocalProductById } from '../data/products'
import { getSignedUrl, getPublicUrl } from './supabase'

// Configuration: Priority order: Database > External API > Local data
// Use database if DATABASE_URL exists, unless explicitly disabled
const USE_DATABASE = process.env.USE_PRODUCTS_DATABASE !== 'false' && !!process.env.DATABASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_PRODUCTS_API_URL || process.env.PRODUCTS_API_URL || ''
const USE_API = process.env.NEXT_PUBLIC_USE_PRODUCTS_API === 'true' || process.env.USE_PRODUCTS_API === 'true'

// Supabase Storage configuration
const PRODUCT_IMAGES_BUCKET = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images'
const USE_SUPABASE_IMAGES = process.env.USE_SUPABASE_IMAGES === 'true'
const USE_PUBLIC_IMAGE_URLS = process.env.SUPABASE_USE_PUBLIC_IMAGES === 'true'

/**
 * Fetch all products from database (Supabase via Prisma)
 * Falls back to external API or local data if database is not available
 */
export async function getProducts() {
  // Try database first if configured (Prisma)
  if (USE_DATABASE) {
    try {
      const products = await prisma.product.findMany({
        orderBy: {
          id: 'asc',
        },
      })

      if (products && products.length > 0) {
        console.log(`Fetched ${products.length} products from database`)
        // Transform Prisma results to match expected format
        const transformedProducts = products.map(product => ({
          id: product.id,
          category: product.category,
          name: product.name,
          price: product.price,
          priceValue: product.priceValue,
          description: product.description,
          image: product.image || '', // Supabase Storage path
          images: product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images)) : null, // JSON array of image paths
          imageBucket: product.imageBucket || null, // Optional bucket override
        }))
        
        // Optionally enrich with Supabase Storage URLs
        if (USE_SUPABASE_IMAGES) {
          console.log('[products.js] Enriching products with image URLs...')
          const enrichedProducts = await enrichProductsWithImageUrls(transformedProducts)
          console.log('[products.js] Enriched products with image URLs:', enrichedProducts.map(p => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl,
            imageUrls: p.imageUrls,
            image: p.image
          })))
          return enrichedProducts
        }
        console.log('[products.js] USE_SUPABASE_IMAGES is false, returning products without image URL enrichment')
        console.log('[products.js] Products returned:', transformedProducts.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image,
          images: p.images
        })))
        return transformedProducts
      }
    } catch (error) {
      console.error('Failed to fetch products from database:', error)
      console.log('Falling back to alternative data source')
    }
  }

  // Fallback to external API if configured
  if (USE_API && API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PRODUCTS_API_KEY && {
            'Authorization': `Bearer ${process.env.PRODUCTS_API_KEY}`,
          }),
        },
        // Cache for 60 seconds in production
        next: { revalidate: 60 },
      })

      if (response.ok) {
        const data = await response.json()
        const products = Array.isArray(data) ? data : data.products || data.items || []
        
        console.log(`Fetched ${products.length} products from external API`)
        return products.map(product => ({
          id: product.id,
          category: product.category || 'Essentials',
          name: product.name || product.title,
          price: product.price || `$${product.priceValue || 0}`,
          priceValue: product.priceValue || parseFloat(product.price?.replace('$', '') || 0),
          description: product.description || '',
          image: product.image || product.imageUrl || product.thumbnail || '/placeholder.jpg',
        }))
      }
    } catch (error) {
      console.error('Failed to fetch products from API:', error)
    }
  }

  // Final fallback to local data
  console.log('Using local product data (database/API not available)')
  return localProducts
}

/**
 * Fetch a single product by ID from database (Supabase via Prisma)
 * Falls back to external API or local data if database is not available
 */
export async function getProduct(id) {
  const productId = parseInt(id)

  // Try database first if configured (Prisma)
  if (USE_DATABASE) {
    try {
      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
      })

      if (product) {
        console.log(`Fetched product ${id} from database`)
        const transformedProduct = {
          id: product.id,
          category: product.category,
          name: product.name,
          price: product.price,
          priceValue: product.priceValue,
          description: product.description,
          image: product.image || '', // Supabase Storage path
          images: product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images)) : null, // JSON array of image paths
          imageBucket: product.imageBucket || null, // Optional bucket override
        }
        
        // Optionally enrich with Supabase Storage URL
        if (USE_SUPABASE_IMAGES) {
          return await enrichProductWithImageUrl(transformedProduct)
        }
        
        return transformedProduct
      }
    } catch (error) {
      console.error(`Failed to fetch product ${id} from database:`, error)
      console.log('Falling back to alternative data source')
    }
  }

  // Fallback to external API if configured
  if (USE_API && API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PRODUCTS_API_KEY && {
            'Authorization': `Bearer ${process.env.PRODUCTS_API_KEY}`,
          }),
        },
        // Cache for 60 seconds
        next: { revalidate: 60 },
      })

      if (response.ok) {
        const product = await response.json()
        console.log(`Fetched product ${id} from external API`)
        return {
          id: product.id,
          category: product.category || 'Essentials',
          name: product.name || product.title,
          price: product.price || `$${product.priceValue || 0}`,
          priceValue: product.priceValue || parseFloat(product.price?.replace('$', '') || 0),
          description: product.description || '',
          image: product.image || product.imageUrl || product.thumbnail || '/placeholder.jpg',
        }
      } else if (response.status === 404) {
        return null
      }
    } catch (error) {
      console.error(`Failed to fetch product ${id} from API:`, error)
    }
  }

  // Final fallback to local data
  console.log(`Using local product data for product ${id}`)
  return getLocalProductById(id)
}

/**
 * Enrich a single product with Supabase Storage image URLs
 * @param {Object} product - Product object with image/imageBucket fields
 * @returns {Promise<Object>} - Product with imageUrl and imageUrls fields added
 * 
 * Supports all image formats including: JPG, PNG, GIF, WebP, AVIF, etc.
 * No file extension validation - works with any file type stored in Supabase Storage
 */
async function enrichProductWithImageUrl(product) {
  // Determine which bucket to use (product-specific or default)
  const bucketName = product.imageBucket || PRODUCT_IMAGES_BUCKET
  
  // Get image paths from images array (preferred) or image field (fallback)
  let imagePaths = []
  let hasLocalPaths = false
  
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    // Use images array if available
    imagePaths = product.images.filter(path => path && typeof path === 'string')
    // Check if any paths are local (start with /)
    hasLocalPaths = imagePaths.some(path => path.startsWith('/'))
    
    // If all paths are local, return them as-is
    if (hasLocalPaths && imagePaths.every(path => path.startsWith('/'))) {
      return {
        ...product,
        imageUrl: imagePaths[0],
        imageUrls: imagePaths,
        imagePaths: imagePaths,
      }
    }
    // Filter out local paths for Supabase processing
    imagePaths = imagePaths.filter(path => !path.startsWith('/'))
  } else if (product.image && product.image !== '/placeholder.jpg') {
    // Check if it's a local path (starts with /)
    if (product.image.startsWith('/')) {
      // Local path - return as-is without Supabase URL conversion
      return {
        ...product,
        imageUrl: product.image,
        imageUrls: [product.image],
        imagePaths: [product.image],
      }
    }
    // Fallback to image field - parse if comma-separated
    if (product.image.includes(',')) {
      imagePaths = product.image.split(',').map(p => p.trim()).filter(Boolean)
    } else {
      imagePaths = [product.image]
    }
  }

  if (imagePaths.length === 0) {
    // No image paths found - return product without imageUrl/imageUrls fields
    return product
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    // Generate URLs for all images
    const imageUrls = await Promise.all(
      imagePaths.map(async (path) => {
        let url = null
        
        // Try to get URL from Supabase client if configured
        if (USE_PUBLIC_IMAGE_URLS) {
          url = getPublicUrl(bucketName, path)
        } else {
          // Try signed URL, but fallback to public if client not initialized
          url = await getSignedUrl(bucketName, path)
        }
        
        // Fallback: construct public URL directly if Supabase client failed or not configured
        if (!url && supabaseUrl) {
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          url = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`
          console.log(`[products.js] Constructed public URL for product ${product.id}: ${url}`)
        }
        
        // Return URL or path (frontend will handle path conversion)
        return url || path
      })
    )

    // Filter out any null/undefined URLs
    const validImageUrls = imageUrls.filter(url => url && url !== null)

    return {
      ...product,
      imageUrl: validImageUrls[0] || product.image, // Primary image URL (first one)
      imageUrls: validImageUrls.length > 0 ? validImageUrls : imageUrls, // All image URLs
      imagePaths: imagePaths, // Original paths for reference
    }
  } catch (error) {
    console.error(`Error enriching product ${product.id} with image URLs:`, error)
    // On error, try to construct public URLs directly as fallback
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && imagePaths.length > 0) {
      const fallbackUrls = imagePaths.map(path => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path
        return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`
      })
      return {
        ...product,
        imageUrl: fallbackUrls[0],
        imageUrls: fallbackUrls,
        imagePaths: imagePaths,
      }
    }
    return product
  }
}

/**
 * Enrich multiple products with Supabase Storage image URLs
 * @param {Array} products - Array of product objects
 * @returns {Promise<Array>} - Products with imageUrl fields added
 */
async function enrichProductsWithImageUrls(products) {
  return Promise.all(products.map(product => enrichProductWithImageUrl(product)))
}

