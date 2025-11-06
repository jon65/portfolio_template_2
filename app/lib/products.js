// Server-side product data fetching
// Supports both external API and fallback to local data

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_PRODUCTS_API_URL || process.env.PRODUCTS_API_URL || ''
const USE_API = process.env.NEXT_PUBLIC_USE_PRODUCTS_API === 'true' || process.env.USE_PRODUCTS_API === 'true'

// Fallback to local data if API is not configured
import { products as localProducts, getProductById as getLocalProductById } from '../data/products'

/**
 * Fetch all products from API
 * Falls back to local data if API is not configured or fails
 */
export async function getProducts() {
  // If API is not configured, use local data
  if (!USE_API || !API_BASE_URL) {
    console.log('Using local product data (API not configured)')
    return Promise.resolve(localProducts)
  }

  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add API key if needed
        ...(process.env.PRODUCTS_API_KEY && {
          'Authorization': `Bearer ${process.env.PRODUCTS_API_KEY}`,
        }),
      },
      // Cache for 60 seconds in production
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Transform API response to match expected format
    // Adjust this based on your API response structure
    const products = Array.isArray(data) ? data : data.products || data.items || []
    
    // Ensure products have required fields
    return products.map(product => ({
      id: product.id,
      category: product.category || 'Essentials',
      name: product.name || product.title,
      price: product.price || `$${product.priceValue || 0}`,
      priceValue: product.priceValue || parseFloat(product.price?.replace('$', '') || 0),
      description: product.description || '',
      image: product.image || product.imageUrl || product.thumbnail || '/placeholder.jpg',
    }))
  } catch (error) {
    console.error('Failed to fetch products from API:', error)
    console.log('Falling back to local product data')
    // Fallback to local data on error
    return localProducts
  }
}

/**
 * Fetch a single product by ID from API
 * Falls back to local data if API is not configured or fails
 */
export async function getProduct(id) {
  // If API is not configured, use local data
  if (!USE_API || !API_BASE_URL) {
    return Promise.resolve(getLocalProductById(id))
  }

  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add API key if needed
        ...(process.env.PRODUCTS_API_KEY && {
          'Authorization': `Bearer ${process.env.PRODUCTS_API_KEY}`,
        }),
      },
      // Cache for 60 seconds
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const product = await response.json()
    
    // Transform API response to match expected format
    return {
      id: product.id,
      category: product.category || 'Essentials',
      name: product.name || product.title,
      price: product.price || `$${product.priceValue || 0}`,
      priceValue: product.priceValue || parseFloat(product.price?.replace('$', '') || 0),
      description: product.description || '',
      image: product.image || product.imageUrl || product.thumbnail || '/placeholder.jpg',
    }
  } catch (error) {
    console.error(`Failed to fetch product ${id} from API:`, error)
    console.log('Falling back to local product data')
    // Fallback to local data on error
    return getLocalProductById(id)
  }
}


