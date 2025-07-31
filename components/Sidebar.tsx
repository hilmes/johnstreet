'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { swissTrading as ds } from '@/lib/design/SwissTradingDesignSystem'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Dashboard as ControlIcon,
  ShowChart as ExecuteIcon,
  Science as LabIcon,
  Shield as RiskIcon,
  Analytics as IntelIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material'

const DRAWER_WIDTH = 220
const DRAWER_WIDTH_CLOSED = 60

interface NavItem {
  title: string
  path?: string
  icon: React.ReactNode
  children?: NavItem[]
}

// Swiss Trading Platform - 5 Core Views
const navItems: NavItem[] = [
  {
    title: 'Control Center',
    path: '/control-center',
    icon: <ControlIcon />,
  },
  {
    title: 'Execution Hub',
    path: '/execution',
    icon: <ExecuteIcon />,
  },
  {
    title: 'Strategy Lab',
    path: '/strategy-lab',
    icon: <LabIcon />,
  },
  {
    title: 'Risk Console',
    path: '/risk-console',
    icon: <RiskIcon />,
  },
  {
    title: 'Intelligence Feed',
    path: '/intelligence',
    icon: <IntelIcon />,
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
  },
]

// Legacy routes mapping for backward compatibility
const legacyRouteMap: Record<string, string> = {
  '/dashboard': '/control-center',
  '/trading/live': '/execution',
  '/trading/paper': '/execution',
  '/trading/orders': '/execution', 
  '/strategies': '/strategy-lab',
  '/strategies/backtest': '/strategy-lab',
  '/strategies/performance': '/strategy-lab',
  '/analytics/market': '/intelligence',
  '/analytics/portfolio': '/control-center',
  '/risk/dashboard': '/risk-console',
  '/risk/pump-detector': '/risk-console',
  '/risk/alerts': '/risk-console',
  '/activity-feed': '/intelligence',
  '/portfolio': '/control-center',
}

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const handleExpandClick = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isItemActive = (item: NavItem): boolean => {
    if (item.path) {
      return pathname === item.path
    }
    if (item.children) {
      return item.children.some(child => child.path === pathname)
    }
    return false
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.includes(item.title)
    const hasChildren = item.children && item.children.length > 0

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          {item.path ? (
            <Link href={item.path} passHref style={{ textDecoration: 'none' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  pl: depth > 0 ? 4 : 2.5,
                  backgroundColor: isActive ? 'primary.dark' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: isActive ? 'primary.light' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  sx={{
                    opacity: open ? 1 : 0,
                    color: isActive ? 'primary.light' : 'inherit',
                  }}
                  primaryTypographyProps={{
                    fontSize: depth > 0 ? '0.875rem' : '1rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </Link>
          ) : (
            <ListItemButton
              onClick={() => hasChildren && handleExpandClick(item.title)}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                backgroundColor: isActive ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                  color: isActive ? 'primary.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                sx={{
                    opacity: open ? 1 : 0,
                    color: isActive ? 'primary.main' : 'inherit',
                }}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 400,
                }}
              />
              {hasChildren && open && (
                isExpanded ? <ExpandLess /> : <ExpandMore />
              )}
            </ListItemButton>
          )}
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    )
  }

  const drawerContent = (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          p: 2,
          minHeight: 64,
        }}
      >
{open ? (
          <Typography 
            variant="h6" 
            sx={{ 
              color: ds.trading.colors.textPrimary, 
              fontWeight: ds.trading.typography.weights.bold,
              fontFamily: ds.trading.typography.interface,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            JohnStreet
          </Typography>
        ) : (
          <Box sx={{ 
            color: ds.trading.colors.profit, 
            fontFamily: ds.trading.typography.trading, 
            fontSize: '8px', 
            fontWeight: ds.trading.typography.weights.bold, 
            lineHeight: 1.0,
            textAlign: 'center',
            textShadow: `0 0 8px ${ds.trading.colors.profit}`,
          }}>
            <pre style={{ margin: 0, color: 'inherit' }}>{`
██ ██
█  █ 
██ ██
 █  █
██ ██`}</pre>
          </Box>
        )}
        <IconButton onClick={onToggle} sx={{ ml: open ? 0 : 'auto' }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map(item => renderNavItem(item))}
      </List>
    </>
  )

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={open && isMobile}
        onClose={onToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            backgroundColor: ds.trading.colors.surface,
            borderRight: `1px solid ${ds.trading.colors.border}`,
            color: ds.trading.colors.textPrimary,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_CLOSED,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            position: 'fixed',
            width: open ? DRAWER_WIDTH : DRAWER_WIDTH_CLOSED,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            backgroundColor: ds.trading.colors.surface,
            borderRight: `1px solid ${ds.trading.colors.border}`,
            color: ds.trading.colors.textPrimary,
            overflowX: 'hidden',
            height: '100vh',
            top: 0,
            left: 0,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  )
}