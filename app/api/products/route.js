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
      
      return NextResponse.json(product)
    }

    // Fetch all products
    const products = await getProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', message: error.message },
      { status: 500 }
    )
  }
}

