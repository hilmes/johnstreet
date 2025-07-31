/**
 * Swiss Trading Design System
 * 
 * A professional trading platform design system combining:
 * - Swiss Design discipline (grid, typography, clarity)
 * - Tufte data visualization principles (high data-ink ratio)
 * - Trading-specific optimizations (risk colors, density, speed)
 * 
 * Built on the existing TufteDesignSystem foundation with enhancements for:
 * - 24/7 dark theme monitoring
 * - High-contrast risk semantics
 * - Dense data presentation
 * - Real-time trading workflows
 */

export interface SwissTradingTokens {
  // Enhanced Typography for Trading
  typography: {
    fonts: {
      interface: string      // Inter - clean UI text
      data: string          // JetBrains Mono - trading numbers
      display: string       // Inter - headers, alerts
    }
    
    // Golden ratio scale optimized for data density
    scale: {
      metadata: string      // 0.618rem - timestamps, labels
      body: string         // 1rem - standard text
      secondary: string    // 1.618rem - important data
      primary: string      // 2.618rem - key metrics
      critical: string     // 4.236rem - hero P&L
    }
    
    weights: {
      light: number        // 300 - subtle data
      regular: number      // 400 - standard text
      medium: number       // 500 - important data
      semibold: number     // 600 - alerts, headers
      bold: number         // 700 - critical only
    }
    
    lineHeights: {
      tight: number        // 1.2 - dense data tables
      normal: number       // 1.5 - readable text
      relaxed: number      // 1.7 - headers
    }
  }
  
  // Trading-Optimized Color System
  colors: {
    // Dark theme foundation for 24/7 monitoring
    surface: {
      background: string   // #0A0A0A - main background
      elevated: string     // #1A1A1A - cards, panels
      overlay: string      // #2A2A2A - modals, dropdowns
      border: string       // #333333 - subtle dividers
      borderFocus: string  // #555555 - active borders
    }
    
    // Text hierarchy for dark theme
    text: {
      primary: string      // #E0E0E0 - main text
      secondary: string    // #B0B0B0 - supporting text
      muted: string        // #888888 - metadata
      inverse: string      // #0A0A0A - text on light
    }
    
    // Trading semantics (high contrast)
    trading: {
      profit: string       // #10B981 - gains, long positions
      loss: string         // #EF4444 - losses, short positions
      neutral: string      // #9CA3AF - no change
      warning: string      // #F59E0B - caution, alerts
      critical: string     // #DC2626 - danger, stop losses
      
      // Market data
      bid: string          // #059669 - buy pressure
      ask: string          // #DC2626 - sell pressure
      volume: string       // #3B82F6 - volume indicators
      
      // Order states
      pending: string      // #F59E0B - pending orders
      filled: string       // #10B981 - completed orders
      cancelled: string    // #6B7280 - cancelled orders
      rejected: string     // #EF4444 - failed orders
    }
    
    // System states
    system: {
      active: string       // #3B82F6 - active elements
      inactive: string     // #6B7280 - disabled states
      focus: string        // #60A5FA - keyboard focus
      selection: string    // #1E40AF - selected items
    }
  }
  
  // Swiss Grid System (extended)
  grid: {
    // Standard 12-column grid
    columns: number        // 12
    gutter: string         // 24px
    margin: string         // 48px
    maxWidth: string       // 1440px
    
    // Trading-specific layouts
    trading: {
      sidebar: string      // 280px - navigation
      orderbook: string    // 320px - order book width
      charts: string       // 60% - chart area ratio
      panels: string       // 40% - side panels ratio
    }
    
    // Breakpoints for responsive design
    breakpoints: {
      mobile: string       // 768px
      tablet: string       // 1024px
      desktop: string      // 1440px
      ultrawide: string    // 1920px
    }
  }
  
  // Spacing system (8pt grid + golden ratio)
  spacing: {
    px: string            // 1px - hairlines
    xs: string            // 4px - tight spacing
    sm: string            // 8px - base unit
    md: string            // 16px - comfortable
    lg: string            // 24px - sections
    xl: string            // 32px - major sections
    xxl: string           // 48px - page divisions
    xxxl: string          // 64px - hero sections
  }
  
  // Animation system for real-time updates
  animations: {
    // Micro-interactions
    fast: string          // 100ms - hover states
    normal: string        // 200ms - transitions
    slow: string          // 300ms - layout changes
    
    // Real-time data updates
    pulse: string         // 500ms - price updates
    flash: string         // 800ms - alert notifications
    
    // Easing curves
    easeIn: string        // ease-in - accelerating
    easeOut: string       // ease-out - decelerating
    easeInOut: string     // ease-in-out - natural
  }
  
  // Shadows for depth hierarchy
  shadows: {
    none: string          // No shadow
    subtle: string        // Slight elevation
    medium: string        // Cards, panels
    large: string         // Modals, overlays
    focus: string         // Focus indicators
  }
  
  // Border radius system
  radii: {
    none: string          // 0px - sharp edges
    sm: string            // 4px - subtle rounding
    md: string            // 8px - standard cards
    lg: string            // 12px - prominent elements
    full: string          // 9999px - pills, badges
  }
}

// Implementation of the Swiss Trading Design System
export const swissTrading: SwissTradingTokens = {
  typography: {
    fonts: {
      interface: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      data: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
      display: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    
    scale: {
      metadata: '0.618rem',    // ~10px
      body: '1rem',            // 16px
      secondary: '1.618rem',   // ~26px
      primary: '2.618rem',     // ~42px
      critical: '4.236rem'     // ~68px
    },
    
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7
    }
  },
  
  colors: {
    surface: {
      background: '#0A0A0A',
      elevated: '#1A1A1A',
      overlay: '#2A2A2A',
      border: '#333333',
      borderFocus: '#555555'
    },
    
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
      muted: '#888888',
      inverse: '#0A0A0A'
    },
    
    trading: {
      profit: '#10B981',
      loss: '#EF4444',
      neutral: '#9CA3AF',
      warning: '#F59E0B',
      critical: '#DC2626',
      
      bid: '#059669',
      ask: '#DC2626',
      volume: '#3B82F6',
      
      pending: '#F59E0B',
      filled: '#10B981',
      cancelled: '#6B7280',
      rejected: '#EF4444'
    },
    
    system: {
      active: '#3B82F6',
      inactive: '#6B7280',
      focus: '#60A5FA',
      selection: '#1E40AF'
    }
  },
  
  grid: {
    columns: 12,
    gutter: '24px',
    margin: '48px',
    maxWidth: '1440px',
    
    trading: {
      sidebar: '280px',
      orderbook: '320px',
      charts: '60%',
      panels: '40%'
    },
    
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
      desktop: '1440px',
      ultrawide: '1920px'
    }
  },
  
  spacing: {
    px: '1px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px'
  },
  
  animations: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    
    pulse: '500ms',
    flash: '800ms',
    
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  
  shadows: {
    none: 'none',
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    focus: '0 0 0 3px rgba(59, 130, 246, 0.5)'
  },
  
  radii: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px'
  }
}

// Layout utilities for consistent spacing and positioning
export const layout = {
  // Container for page content
  container: (maxWidth = swissTrading.grid.maxWidth) => ({
    maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: swissTrading.spacing.lg,
    paddingRight: swissTrading.spacing.lg
  }),
  
  // Card layout for widgets and panels
  card: (elevated = false) => ({
    backgroundColor: elevated ? swissTrading.colors.surface.overlay : swissTrading.colors.surface.elevated,
    border: `1px solid ${swissTrading.colors.surface.border}`,
    borderRadius: swissTrading.radii.md,
    padding: swissTrading.spacing.lg,
    boxShadow: elevated ? swissTrading.shadows.medium : swissTrading.shadows.subtle
  }),
  
  // Grid layout for dashboard widgets
  grid: (columns = 12, gap = swissTrading.spacing.lg) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap
  }),
  
  // Flex utilities
  flex: {
    row: (gap = swissTrading.spacing.md) => ({
      display: 'flex',
      flexDirection: 'row' as const,
      gap
    }),
    
    col: (gap = swissTrading.spacing.md) => ({
      display: 'flex',
      flexDirection: 'column' as const,
      gap
    }),
    
    center: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    between: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  },
  
  // Text alignment utilities
  text: {
    left: { textAlign: 'left' as const },
    center: { textAlign: 'center' as const },
    right: { textAlign: 'right' as const }
  }
}

// Typography utilities for consistent text styling
export const typography = {
  // Trading-specific number formatting
  currency: (value: number, currency = 'USD', precision = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    }).format(value)
  },
  
  // Percentage formatting with color
  percentage: (value: number, precision = 2) => ({
    color: value >= 0 ? swissTrading.colors.trading.profit : swissTrading.colors.trading.loss,
    fontFamily: swissTrading.typography.fonts.data,
    fontWeight: swissTrading.typography.weights.medium
  }),
  
  // Tabular numbers for aligned data
  tabular: {
    fontFamily: swissTrading.typography.fonts.data,
    fontFeatureSettings: '"tnum"',
    fontVariantNumeric: 'tabular-nums'
  }
}

// Animation utilities for real-time updates
export const animations = {
  // Price flash animation for updates
  priceFlash: (isPositive: boolean) => ({
    animation: `priceFlash ${swissTrading.animations.pulse} ${swissTrading.animations.easeOut}`,
    '@keyframes priceFlash': {
      '0%': { backgroundColor: 'transparent' },
      '50%': { 
        backgroundColor: isPositive 
          ? `${swissTrading.colors.trading.profit}20` 
          : `${swissTrading.colors.trading.loss}20` 
      },
      '100%': { backgroundColor: 'transparent' }
    }
  }),
  
  // Fade in animation for new data
  fadeIn: {
    animation: `fadeIn ${swissTrading.animations.normal} ${swissTrading.animations.easeOut}`,
    '@keyframes fadeIn': {
      '0%': { opacity: 0, transform: 'translateY(10px)' },
      '100%': { opacity: 1, transform: 'translateY(0)' }
    }
  },
  
  // Pulse animation for alerts
  pulse: {
    animation: `pulse ${swissTrading.animations.flash} infinite ${swissTrading.animations.easeInOut}`,
    '@keyframes pulse': {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 }
    }
  }
}

export default swissTrading