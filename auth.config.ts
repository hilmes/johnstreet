/**
 * Auth.js Configuration
 * 
 * NextAuth v5+ configuration following AI-GUIDELINES.md standards:
 * - OAuth implementation with proper security
 * - Comprehensive error handling
 * - TypeScript-first approach
 */

import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      const isOnTradingPage = nextUrl.pathname.startsWith('/trading')
      const isOnStrategiesPage = nextUrl.pathname.startsWith('/strategies')
      
      // Protect trading and strategy pages
      if ((isOnDashboard || isOnTradingPage || isOnStrategiesPage) && !isLoggedIn) {
        return false
      }
      
      return true
    },
    
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
    },
    
    async session({ session, token }) {
      session.user.id = token.sub!
      session.accessToken = token.accessToken as string
      session.provider = token.provider as string
      return session
    },
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Security configurations
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  
  // CSRF protection
  useSecureCookies: process.env.NODE_ENV === 'production',
  
  debug: process.env.NODE_ENV === 'development',
}