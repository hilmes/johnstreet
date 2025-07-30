/**
 * NextAuth v5 Main Configuration
 * 
 * Following AI-GUIDELINES.md standards for authentication
 */

import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)