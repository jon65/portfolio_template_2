// Script to update Product 1 with Supabase Storage image path
// Run with: node prisma/update-product-1-image.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // Update product 1 with image path
    const product = await prisma.product.update({
      where: { id: 1 },
      data: {
        image: 'products/1/OIP.webp',
        // Optionally also store in images array
        images: ['products/1/OIP.webp'],
      },
    })

    console.log('✅ Product 1 updated successfully:')
    console.log(`   ID: ${product.id}`)
    console.log(`   Name: ${product.name}`)
    console.log(`   Image path: ${product.image}`)
    console.log(`   Images array: ${JSON.stringify(product.images)}`)
    console.log('\n📝 Note: The backend will automatically generate the full URL from this path.')
    console.log('   Full URL will be: https://jwlqmbxxnetwewyrvzpx.supabase.co/storage/v1/object/public/product-images/products/1/OIP.webp')
  } catch (error) {
    console.error('❌ Error updating product:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

