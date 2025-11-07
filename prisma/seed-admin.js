/**
 * Seed script to create an admin user
 * Run with: node prisma/seed-admin.js
 * 
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword node prisma/seed-admin.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Admin User'

  console.log('Creating admin user...')
  console.log(`Email: ${email}`)
  console.log(`Name: ${name}`)

  // Check if user already exists
  const existingUser = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (existingUser) {
    console.log('❌ Admin user already exists with this email.')
    console.log('   To update the password, delete the user first or use a different email.')
    process.exit(1)
  }

  // Hash password
  const saltRounds = 12
  const passwordHash = await bcrypt.hash(password, saltRounds)

  // Create admin user
  const adminUser = await prisma.adminUser.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      isActive: true,
    },
  })

  console.log('✅ Admin user created successfully!')
  console.log(`   ID: ${adminUser.id}`)
  console.log(`   Email: ${adminUser.email}`)
  console.log(`   Name: ${adminUser.name}`)
  console.log('\n📝 Login credentials:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log('\n⚠️  Please change the default password after first login!')
}

main()
  .catch((error) => {
    console.error('Error creating admin user:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

