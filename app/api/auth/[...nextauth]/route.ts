/**
 * NextAuth v5 API Route Handler
 * 
 * Following AI-GUIDELINES.md standards:
 * - Edge Runtime configuration
 * - Proper error handling
 */

export const runtime = 'edge'

import { handlers } from '@/auth'
export const { GET, POST } = handlers