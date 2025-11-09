// API Route to fetch product images from Supabase Storage
import { NextResponse } from 'next/server'
import { getSignedUrl, getPublicUrl, listFiles } from '../../../lib/supabase'
import { prisma } from '../../../lib/prisma'

// Default bucket name for product images
const PRODUCT_IMAGES_BUCKET = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images'
const USE_PUBLIC_URLS = process.env.SUPABASE_USE_PUBLIC_IMAGES === 'true'

/**
 * GET /api/products/images
 * 
 * Query parameters:
 * - productId: (optional) Get images for a specific product
 * - bucket: (optional) Override default bucket name
 * - public: (optional) Use public URLs instead of signed URLs (default: false)
 * 
 * Returns:
 * - For specific product: { productId, images: [{ url, path, ... }] }
 * - For all products: [{ productId, images: [...] }, ...]
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const bucketName = searchParams.get('bucket') || PRODUCT_IMAGES_BUCKET
    const usePublic = searchParams.get('public') === 'true' || USE_PUBLIC_URLS

    // If productId is provided, get images for that specific product
    if (productId) {
      return await getProductImages(productId, bucketName, usePublic)
    }

    // Otherwise, get images for all products
    return await getAllProductImages(bucketName, usePublic)
  } catch (error) {
    console.error('Product images API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product images', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get images for a specific product
 */
async function getProductImages(productId, defaultBucketName, usePublic) {
  try {
    // Get product from database to find image paths
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Use product-specific bucket if available
    const bucketName = product.imageBucket || defaultBucketName
    const images = await getImagesForProduct(product, bucketName, usePublic)

    return NextResponse.json({
      productId: product.id,
      productName: product.name,
      bucket: bucketName,
      images
    })
  } catch (error) {
    console.error(`Error fetching images for product ${productId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch product images', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get images for all products
 */
async function getAllProductImages(bucketName, usePublic) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' }
    })

    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await getImagesForProduct(product, bucketName, usePublic)
        return {
          productId: product.id,
          productName: product.name,
          images
        }
      })
    )

    return NextResponse.json(productsWithImages)
  } catch (error) {
    console.error('Error fetching images for all products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product images', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get images for a product based on its image/images/imageBucket fields
 * Supports multiple formats:
 * - images JSON array (preferred): ["products/1/main.jpg", "products/1/detail-1.jpg"]
 * - Single image path: "products/123/image.jpg"
 * - Multiple images (comma-separated): "products/123/image1.jpg,products/123/image2.jpg"
 * - Folder path: "products/123/" (will list all files in folder)
 */
async function getImagesForProduct(product, defaultBucketName, usePublic) {
  // Use product-specific bucket if available, otherwise use default
  const bucketName = product.imageBucket || defaultBucketName
  
  // Get image paths from images array (preferred) or image field (fallback)
  let imagePaths = []
  
  // First, try to use the images JSON array field
  if (product.images) {
    try {
      const parsed = Array.isArray(product.images) 
        ? product.images 
        : JSON.parse(product.images)
      if (Array.isArray(parsed)) {
        imagePaths = parsed.filter(path => path && typeof path === 'string')
      }
    } catch (error) {
      console.error(`Error parsing images JSON for product ${product.id}:`, error)
    }
  }
  
  // Fallback to image field if images array is empty
  if (imagePaths.length === 0 && product.image) {
    const imageField = product.image
    
    // Skip if placeholder or local path
    if (imageField === '/placeholder.jpg' || imageField.startsWith('/')) {
      return []
    }
    
    // Check if image field contains multiple paths (comma-separated)
    if (imageField.includes(',')) {
      imagePaths = imageField.split(',').map(p => p.trim()).filter(Boolean)
    } 
    // Check if image field is a folder path (ends with /)
    else if (imageField.endsWith('/')) {
      // List all files in the folder
      const files = await listFiles(bucketName, imageField)
      imagePaths = files.map(file => `${imageField}${file.name}`)
    }
    // Single image path
    else {
      imagePaths = [imageField]
    }
  }

  if (imagePaths.length === 0) {
    return []
  }

  // Generate URLs for all image paths
  const images = []
  
  for (const path of imagePaths) {
    const url = usePublic 
      ? getPublicUrl(bucketName, path)
      : await getSignedUrl(bucketName, path)
    
    if (url) {
      images.push({
        url,
        path,
        bucket: bucketName,
        isPublic: usePublic
      })
    }
  }

  return images
}

