import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Middleware to protect admin routes
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Only protect admin routes
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('admin-auth-token')?.value
      
      if (!token) {
        // Redirect to login if no token
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Verify token
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        if (!decoded || decoded.type !== 'admin') {
          // Invalid token, redirect to login
          const loginUrl = new URL('/admin/login', request.url)
          loginUrl.searchParams.set('redirect', pathname)
          return NextResponse.redirect(loginUrl)
        }
      } catch (error) {
        // Token verification failed, redirect to login
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Token is valid, allow access
      return NextResponse.next()
    } catch (error) {
      // Error accessing cookies, redirect to login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Allow all other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
}

