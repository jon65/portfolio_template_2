import { getProduct } from '../../lib/products'
import ProductDetailClient from '../../components/ProductDetailClient'
import { notFound } from 'next/navigation'

export default async function ProductPage({ params }) {
  // In Next.js 14+, params is a Promise
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  return <ProductDetailClient product={product} />
}

