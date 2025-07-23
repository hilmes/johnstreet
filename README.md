# JohnStreet - Secure Trading Dashboard

A Next.js-based cryptocurrency trading dashboard with restricted access and Python backend integration.

## Features

- 🔒 **Secure Authentication** - Restricted to `jhilmes@gmail.com` only
- 📊 **Real-time Trading Dashboard** - Market data, portfolio, and analytics
- 🤖 **Strategy Management** - Create and monitor trading strategies  
- 📈 **Technical Analysis** - RSI, MACD, and other indicators
- 🎨 **Modern UI** - Material-UI + Tailwind CSS hybrid approach

## Architecture

```
Frontend (Next.js on Vercel) ←→ Backend (Python on your server)
```

## Deployment Setup

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:4001/api/auth/callback/google` (local)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)

### 2. Vercel Deployment

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Set Environment Variables in Vercel:**
   ```bash
   # Production backend URL (your server)
   NEXT_PUBLIC_API_URL=https://your-backend-server.com
   NEXT_PUBLIC_WS_URL=wss://your-backend-server.com
   NEXT_PUBLIC_PYTHON_API_URL=https://your-backend-server.com
   
   # NextAuth
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-secure-random-string
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Kraken (optional - for client-side WebSocket)
   NEXT_PUBLIC_KRAKEN_WSS_URI=wss://ws.kraken.com
   NEXT_PUBLIC_DEFAULT_PAIR=XBT/USD
   ```

### 3. Backend Server Setup

Keep your Python backend running on your current server with PM2:

```bash
# Your existing PM2 setup should continue running
pm2 start ecosystem.config.js --only johnstreet-backend
```

Update your Python backend to accept CORS from your Vercel domain:

```python
# In your Python app
ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",
    "http://localhost:4001",  # for development
]
```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in your actual values
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Run with Python backend:**
   ```bash
   npm run dev:all
   ```

## Security Features

- ✅ **Single User Access** - Only `jhilmes@gmail.com` can sign in
- ✅ **JWT-based Sessions** - Secure authentication tokens
- ✅ **Middleware Protection** - All routes require authentication
- ✅ **CSRF Protection** - Built-in NextAuth security
- ✅ **Environment Isolation** - Secrets not exposed to client

## File Structure

```
johnstreet/
├── app/                    # Next.js app directory
│   ├── api/auth/          # NextAuth routes
│   ├── auth/              # Sign-in/error pages
│   ├── dashboard/         # Trading dashboard
│   ├── analysis/          # Performance analysis
│   ├── strategies/        # Strategy management
│   └── settings/          # Configuration
├── components/            # Reusable components
│   └── widgets/          # Trading widgets
├── middleware.ts          # Authentication middleware
└── vercel.json           # Vercel configuration
```

## Deployment Checklist

- [ ] Google OAuth configured with production URLs
- [ ] Environment variables set in Vercel
- [ ] Backend server CORS updated for Vercel domain
- [ ] SSL certificates for backend (recommended)
- [ ] Monitor backend server uptime
- [ ] Set up backup strategy for backend

## Production URLs

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend-server.com` (your existing server)
- **Auth**: Restricted to `jhilmes@gmail.com` only

---

**Note**: This setup provides frontend scalability via Vercel while keeping your trading backend on dedicated infrastructure for zero-downtime requirements.