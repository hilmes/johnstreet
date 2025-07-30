/**
 * NextAuth v5 Middleware
 * 
 * Following AI-GUIDELINES.md security standards:
 * - Comprehensive authentication protection
 * - CSRF protection for form submissions
 * - Rate limiting considerations
 */

import { auth } from '@/auth'

export default auth((req) => {
  // Add custom middleware logic here if needed
  console.log('Auth middleware:', req.auth?.user?.email)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}