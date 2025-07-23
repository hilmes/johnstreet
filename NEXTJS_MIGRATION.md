# JohnStreet Next.js Migration Guide

## Overview
This guide documents the conversion of JohnStreet from a Create React App to a Next.js application.

## What's Changed

### 1. Project Structure
- Moved from `src/` directory to Next.js App Router structure
- Created `app/` directory for pages and layouts
- Moved components to root-level directories:
  - `/components` - UI components
  - `/contexts` - React contexts
  - `/services` - API services
  - `/types` - TypeScript types

### 2. Routing
- Replaced React Router with Next.js file-based routing
- Created pages:
  - `/app/page.tsx` - Home (redirects to dashboard)
  - `/app/dashboard/page.tsx` - Main dashboard
  - `/app/trading/page.tsx` - Trading interface
  - `/app/portfolio/page.tsx` - Portfolio management
  - `/app/strategies/page.tsx` - Strategy configuration (to be implemented)
  - `/app/analysis/page.tsx` - Market analysis (to be implemented)
  - `/app/settings/page.tsx` - Settings (to be implemented)

### 3. API Routes
- Created API routes to replace Express server endpoints:
  - `/app/api/kraken/ticker` - Get ticker data
  - `/app/api/kraken/orderbook` - Get order book
  - `/app/api/portfolio/balance` - Get portfolio balance
  - `/app/api/ws` - WebSocket placeholder

### 4. Configuration
- Updated `package.json` with Next.js dependencies
- Created `next.config.js` for Next.js configuration
- Added `tailwind.config.js` for Tailwind CSS
- Created `.env.local` for environment variables

### 5. Styling
- Integrated Tailwind CSS alongside Material-UI
- Created `app/globals.css` for global styles
- Material-UI theme preserved in `app/providers.tsx`

## Getting Started

### Installation
```bash
npm install
```

### Development
Run both the Next.js frontend and Python backend:
```bash
# Terminal 1 - Next.js
npm run dev

# Terminal 2 - Python backend
python main.py

# Or run both together
npm run dev:all
```

### Build
```bash
npm run build
```

### Production
```bash
npm run start
```

## Environment Variables
Update `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:5003
NEXT_PUBLIC_WS_URL=ws://localhost:5003
KRAKEN_API_KEY=your_api_key
KRAKEN_API_SECRET=your_api_secret
```

## Next Steps

### Immediate Tasks
1. Complete remaining page implementations (strategies, analysis, settings)
2. Set up proper WebSocket connection handling
3. Implement authentication if needed
4. Add error boundaries and loading states

### Backend Integration
The Python backend remains unchanged and runs separately. The Next.js app communicates with it via:
- REST API calls to `http://localhost:5000`
- WebSocket connections to `ws://localhost:5000`

### Deployment
For production deployment:
1. Build the Next.js app: `npm run build`
2. Deploy to Vercel, Netlify, or any Node.js hosting
3. Deploy Python backend separately
4. Update environment variables for production URLs

## Benefits of Next.js

1. **Performance**: Server-side rendering and static generation
2. **SEO**: Better search engine optimization
3. **API Routes**: Built-in API handling
4. **Image Optimization**: Automatic image optimization
5. **File-based Routing**: Simpler routing structure
6. **TypeScript**: Better TypeScript support out of the box
7. **Developer Experience**: Fast refresh, better error handling

## Troubleshooting

### Common Issues
1. **Module not found errors**: Update import paths to use `@/` prefix
2. **WebSocket connection**: Use the Python backend WebSocket server
3. **CORS issues**: Middleware configured to handle CORS

### Migration Checklist
- [x] Project structure setup
- [x] Basic pages created
- [x] API routes implemented
- [x] Environment variables configured
- [x] Styling system integrated
- [ ] All components migrated
- [ ] WebSocket integration completed
- [ ] Authentication implemented
- [ ] Production deployment tested