import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const COOKIE_NAME = 'admin-auth-token'

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for an admin user
 */
export function generateToken(userId, email) {
  return jwt.sign(
    { userId, email, type: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

/**
 * Get authentication token from cookie
 */
export async function getAuthToken() {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

/**
 * Remove authentication cookie
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Get authenticated user from request
 * Returns user info if authenticated, null otherwise
 */
export async function getAuthenticatedUser() {
  try {
    const token = await getAuthToken()
    if (!token) {
      return null
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.type !== 'admin') {
      return null
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    }
  } catch (error) {
    return null
  }
}

/**
 * Middleware helper to check authentication
 * Throws error if not authenticated
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

