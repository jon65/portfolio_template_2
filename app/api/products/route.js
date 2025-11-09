// Next.js API Route - Products API
// Fetches products from Supabase via Prisma, with fallbacks to external API or local data
import { NextResponse } from 'next/server'
import { getProducts, getProduct } from '../../lib/products'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (productId) {
      // Fetch single product
      const product = await getProduct(productId)
      
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      
      // Include Supabase URL in response for client-side URL construction
      const response = {
        ...product,
        _supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null
      }
      
      return NextResponse.json(response)
    }

    // Fetch all products
    const products = await getProducts()
    
    // Include Supabase URL in response for client-side URL construction
    const response = products.map(product => ({
      ...product,
      _supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null
    }))
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', message: error.message },
      { status: 500 }
    )
  }
}

