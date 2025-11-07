import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { getAuthenticatedUser } from '../../lib/auth'

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser()
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get full user details from database
    const user = await prisma.adminUser.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

