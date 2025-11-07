import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { verifyPassword, generateToken, setAuthCookie } from '../../lib/auth'

/**
 * POST /api/auth/login
 * Authenticate admin user and create session
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    // Check if user exists and is active
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login time
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate token
    const token = generateToken(user.id, user.email)

    // Set cookie
    await setAuthCookie(token)

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}

