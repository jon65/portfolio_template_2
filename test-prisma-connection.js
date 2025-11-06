// Simple connection test - checks if we can reach the database
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function quickTest() {
  console.log('\n🔍 Testing Prisma Connection...\n')
  
  // Check environment variable
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not found in environment')
    console.log('   Make sure .env.local exists and has DATABASE_URL')
    process.exit(1)
  }
  
  console.log('✅ DATABASE_URL is set')
  console.log('   Format:', process.env.DATABASE_URL.substring(0, 30) + '...')
  
  // Create a fresh Prisma client for testing
  const prisma = new PrismaClient({
    log: ['error'],
  })
  
  try {
    console.log('\n🔄 Attempting to connect...')
    
    // Simple connection test using regular Prisma query (works better with pooler)
    // Try to count orders - this will work even if table is empty
    const orderCount = await prisma.order.count()
    
    console.log('✅ Connection successful!')
    console.log('\n📊 Database Info:')
    console.log('   Connection: Working with Transaction Pooler')
    console.log('   Order table: Exists ✅')
    console.log(`   Total orders: ${orderCount}`)
    
    await prisma.$disconnect()
    console.log('\n✅ Test completed successfully!\n')
    process.exit(0)
    
  } catch (error) {
    console.log('\n❌ Connection failed!')
    console.log('\n📋 Error Details:')
    console.log('   Message:', error.message)
    
    // Check if it's a "table doesn't exist" error
    if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01') {
      console.log('\n⚠️  Order table does not exist yet')
      console.log('   Run the SQL script in Supabase Dashboard:')
      console.log('   prisma/create-order-table.sql')
    } else if (error.message.includes("prepared statement")) {
      console.log('\n⚠️  Prepared statement error with connection pooler')
      console.log('   This is a known Prisma + pooler issue')
      console.log('   The connection works, but queries have issues')
      console.log('   Try: Restart your app or use direct connection for testing')
    } else if (error.message.includes("Can't reach database server")) {
      console.log('\n🔧 Troubleshooting Steps:')
      console.log('   1. Check Supabase Dashboard - is database paused?')
      console.log('   2. Verify connection string format')
      console.log('   3. Try connection pooling URL instead')
      console.log('   4. Check network/firewall settings')
    } else if (error.message.includes("Authentication failed")) {
      console.log('\n🔧 Troubleshooting Steps:')
      console.log('   1. Verify database password is correct')
      console.log('   2. Reset password in Supabase Dashboard if needed')
    }
    
    await prisma.$disconnect()
    process.exit(1)
  }
}

quickTest()
