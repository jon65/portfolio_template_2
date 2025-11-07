// Server-side product data fetching
// Supports Prisma/Supabase database, external API, and fallback to local data

import { prisma } from './prisma'
import { products as localProducts, getProductById as getLocalProductById } from '../data/products'

// Configuration: Priority order: Database > External API > Local data
// Use database if DATABASE_URL exists, unless explicitly disabled
const USE_DATABASE = process.env.USE_PRODUCTS_DATABASE !== 'false' && !!process.env.DATABASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_PRODUCTS_API_URL || process.env.PRODUCTS_API_URL || ''
const USE_API = process.env.NEXT_PUBLIC_USE_PRODUCTS_API === 'true' || process.env.USE_PRODUCTS_API === 'true'

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
        return products.map(product => ({
          id: product.id,
          category: product.category,
          name: product.name,
          price: product.price,
          priceValue: product.priceValue,
          description: product.description,
          image: product.image,
        }))
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
        return {
          id: product.id,
          category: product.category,
          name: product.name,
          price: product.price,
          priceValue: product.priceValue,
          description: product.description,
          image: product.image,
        }
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


