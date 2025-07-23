import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './themes.css'
import { Providers } from './providers'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JohnStreet - Cryptocurrency Algorithmic Trading Platform',
  description: 'Advanced algorithmic trading platform for cryptocurrency markets with real-time data from Kraken exchange',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  )
}