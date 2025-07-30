/**
 * Bundle Analyzer Configuration
 * 
 * Following AI-GUIDELINES.md standards for bundle size analysis optimization
 */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash',
      'recharts'
    ],
  },
  
  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
      
      // Bundle splitting optimization
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          trading: {
            test: /[\\/](components|lib)[\\/]trading[\\/]/,
            name: 'trading',
            priority: 10,
            chunks: 'all',
          },
          sentiment: {
            test: /[\\/](components|lib)[\\/]sentiment[\\/]/,
            name: 'sentiment',
            priority: 10,
            chunks: 'all',
          }
        }
      };
    }
    
    // Tree shaking optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
  
  // Environment variables that should be available on the client side
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5003',
  },
  
  // API routes configuration - Use environment variable for backend URL
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
    return [
      {
        source: '/api/kraken/:path*',
        destination: `${backendUrl}/api/kraken/:path*`,
      },
      {
        source: '/api/portfolio/:path*',
        destination: `${backendUrl}/api/portfolio/:path*`,
      },
      {
        source: '/api/trading/:path*',
        destination: `${backendUrl}/api/trading/:path*`,
      },
    ];
  },
  
  // CORS headers for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);