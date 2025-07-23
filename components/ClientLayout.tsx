'use client'

import React, { useState } from 'react'
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme } from '@mui/material'
import { Menu as MenuIcon } from '@mui/icons-material'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const DRAWER_WIDTH = 220
const DRAWER_WIDTH_CLOSED = 60

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const theme = useTheme()
  const pathname = usePathname()

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const getPageTitle = (path: string) => {
    const routes: Record<string, { title: string; subtitle?: string }> = {
      '/dashboard': { title: 'Market Overview', subtitle: 'Real-time market data and portfolio performance' },
      '/trading': { title: 'Live Trading', subtitle: 'Execute trades and manage positions' },
      '/strategies': { title: 'Trading Strategies', subtitle: 'Configure and monitor algorithmic strategies' },
      '/ai-strategy': { title: 'AI Strategy Builder', subtitle: 'Create bespoke trading strategies with Claude AI' },
      '/analysis': { title: 'Market Analysis', subtitle: 'Technical analysis and market insights' },
      '/analysis/performance': { title: 'Performance Analysis', subtitle: 'Strategy performance and risk metrics' },
      '/portfolio': { title: 'Portfolio', subtitle: 'View balances and manage your assets' },
      '/pump-detector': { title: 'Pump Detector', subtitle: 'Social sentiment and anomaly detection' },
      '/backtesting': { title: 'Backtesting Laboratory', subtitle: 'Test and optimize trading algorithms' },
      '/financial-excellence': { title: 'Financial Excellence', subtitle: 'Professional trading dashboard with Tufte-inspired visualizations' },
      '/settings': { title: 'Settings', subtitle: 'Configure platform preferences and API connections' },
    }
    return routes[path] || { title: 'JohnStreet', subtitle: 'Cryptocurrency Algorithmic Trading Platform' }
  }

  const pageInfo = getPageTitle(pathname)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <Sidebar open={sidebarOpen} onToggle={handleToggleSidebar} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: 'background.default',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          // Use margin-left to properly offset content from fixed sidebar
          marginLeft: {
            xs: 0,
            sm: sidebarOpen ? `${DRAWER_WIDTH}px` : `${DRAWER_WIDTH_CLOSED}px`
          },
          // Use full width, margin-left already accounts for sidebar
          width: '100%',
          // Smooth transition matching drawer animation
          transition: theme.transitions.create(['margin-left', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* App Bar for mobile */}
        <AppBar
          position="fixed"
          sx={{
            display: { sm: 'none' },
            backgroundColor: 'background.paper',
            color: 'text.primary',
            boxShadow: 1,
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleToggleSidebar}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 700 }}>
              JohnStreet
            </Typography>
          </Toolbar>
        </AppBar>
        
        {/* Main content area */}
        <Box
          sx={{
            flexGrow: 1,
            pt: { xs: 8, sm: 0 }, // Add padding top on mobile for app bar
            width: '100%',
            overflow: 'auto',
          }}
        >
          {/* Page Header */}
          {pathname !== '/' && (
            <Box 
              className="crypto-container"
              sx={{ 
                px: { xs: 2, sm: 3, md: 4, lg: 5 }, 
                py: 2, 
                borderBottom: '1px solid var(--theme-border, #2a2e39)',
                backgroundColor: 'var(--theme-surface, #1e222d)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderRadius: 0,
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                width: '100%'
              }}
            >
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                color: 'var(--theme-text, #d1d4dc)',
                mb: 0.5,
                fontFamily: 'var(--theme-font-primary)'
              }}>
                {pageInfo.title}
              </Typography>
              {pageInfo.subtitle && (
                <Typography variant="body2" sx={{ 
                  color: 'var(--theme-text-secondary, #787b86)',
                  fontSize: '13px',
                  fontFamily: 'var(--theme-font-primary)'
                }}>
                  {pageInfo.subtitle}
                </Typography>
              )}
            </Box>
          )}
          
          {children}
        </Box>
      </Box>
    </Box>
  )
}