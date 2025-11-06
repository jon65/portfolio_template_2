// Next.js API Route - Products API Proxy
// This can be used as a proxy to your external API or as a standalone API
import { NextResponse } from 'next/server'

// You can use this route to:
// 1. Proxy requests to an external API
// 2. Add authentication/authorization
// 3. Transform data
// 4. Cache responses
// 5. Or serve products directly from a database

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    // Option 1: Proxy to external API
    const EXTERNAL_API_URL = process.env.PRODUCTS_API_URL
    
    if (EXTERNAL_API_URL) {
      const url = productId 
        ? `${EXTERNAL_API_URL}/products/${productId}`
        : `${EXTERNAL_API_URL}/products`
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PRODUCTS_API_KEY && {
            'Authorization': `Bearer ${process.env.PRODUCTS_API_KEY}`,
          }),
        },
      })

      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    // Option 2: Return local data (fallback)
    // Import local products
    const { products, getProductById } = await import('../../data/products')
    
    if (productId) {
      const product = getProductById(productId)
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(product)
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', message: error.message },
      { status: 500 }
    )
  }
}

