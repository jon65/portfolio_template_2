// Script to seed products from local data into Supabase via Prisma
// Run with: node prisma/seed-products.js
//
// IMPORTANT: Make sure to run `npx prisma generate` first to generate the Prisma client
// with the Product model!

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Verify Product model is available
if (!prisma.product) {
  console.error('❌ Error: Product model not found in Prisma client!')
  console.error('Please run: npx prisma generate')
  console.error('This will regenerate the Prisma client with the Product model.')
  process.exit(1)
}

const products = [
  {
    category: 'Essentials',
    name: 'Oversized Hoodie',
    price: '$185',
    priceValue: 185,
    description: 'Premium oversized hoodie crafted from the finest materials. Perfect for everyday comfort and style.',
    image: '/placeholder-hoodie.jpg'
  },
  {
    category: 'Essentials',
    name: 'Relaxed Tee',
    price: '$95',
    priceValue: 95,
    description: 'Classic relaxed fit tee with premium cotton blend. Essential for any wardrobe.',
    image: '/placeholder-tee.jpg'
  },
  {
    category: 'Essentials',
    name: 'Sweat Pants',
    price: '$165',
    priceValue: 165,
    description: 'Comfortable and stylish sweat pants designed for both lounging and active wear.',
    image: '/placeholder-pants.jpg'
  },
  {
    category: 'Collection',
    name: 'Knit Sweater',
    price: '$345',
    priceValue: 345,
    description: 'Luxurious knit sweater with premium yarn. Perfect for layering in cooler weather.',
    image: '/placeholder-sweater.jpg'
  },
  {
    category: 'Athletics',
    name: 'Track Jacket',
    price: '$285',
    priceValue: 285,
    description: 'Performance track jacket with moisture-wicking technology. Ideal for active lifestyles.',
    image: '/placeholder-jacket.jpg'
  },
  {
    category: 'Essentials',
    name: 'Crew Neck',
    price: '$125',
    priceValue: 125,
    description: 'Classic crew neck sweater in a relaxed fit. Versatile and comfortable.',
    image: '/placeholder-crew.jpg'
  }
]

async function main() {
  console.log('Starting product seeding...')
  
  // Test database connection
  try {
    await prisma.$connect()
    console.log('✅ Connected to database')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message)
    
    // Provide helpful guidance based on error type
    if (error.message.includes("Can't reach database server")) {
      console.error('\n🔧 Connection Issue Detected:')
      console.error('   Your connection string appears to be using direct connection format.')
      console.error('   This may not work on IPv4 networks.')
      console.error('\n💡 Solution: Use Connection Pooler URL')
      console.error('   1. Go to Supabase Dashboard → Settings → Database')
      console.error('   2. Find "Connection String" section')
      console.error('   3. Change "Method" to "Session" or "Transaction"')
      console.error('   4. Copy the pooler URL (uses port 6543 and pooler.supabase.com)')
      console.error('   5. Update DATABASE_URL in .env.local')
      console.error('\n   Example format:')
      console.error('   postgresql://postgres.jwlqmbxxnetwewyrvzpx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres')
    } else {
      console.error('\nPlease check your DATABASE_URL environment variable')
      console.error('Make sure it\'s set correctly in .env.local')
    }
    process.exit(1)
  }

  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const product of products) {
    try {
      // Check if product already exists (by name)
      const existing = await prisma.product.findFirst({
        where: { name: product.name }
      })

      if (existing) {
        console.log(`⏭️  Product "${product.name}" already exists (ID: ${existing.id}), skipping...`)
        skippedCount++
        continue
      }

      // Create product
      const created = await prisma.product.create({
        data: product
      })
      console.log(`✅ Created product: ${created.name} (ID: ${created.id})`)
      createdCount++
    } catch (error) {
      console.error(`❌ Error creating product "${product.name}":`, error.message)
      if (error.code) {
        console.error(`   Error code: ${error.code}`)
      }
      errorCount++
    }
  }

  console.log('\n📊 Seeding Summary:')
  console.log(`   Created: ${createdCount}`)
  console.log(`   Skipped: ${skippedCount}`)
  console.log(`   Errors: ${errorCount}`)
  console.log('Product seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

