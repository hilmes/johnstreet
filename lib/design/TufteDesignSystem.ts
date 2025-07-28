/**
 * Tufte-Inspired Design System for Financial Trading
 * 
 * Based on Edward Tufte's principles:
 * - Maximize data-ink ratio
 * - Show the data with clarity and honesty
 * - Eliminate chartjunk
 * - Use small multiples
 * - Integrate text, graphics and tables
 * 
 * Incorporating Swiss Design principles and Japanese aesthetics (ma, wabi-sabi, kanso)
 */

export interface DesignTokens {
  // Typography System - Ellen Lupton inspired hierarchy
  typography: {
    primary: string    // IBM Plex Sans - trading data
    secondary: string  // IBM Plex Mono - numerical values
    accent: string     // Inter - UI elements
    
    // Type Scale (based on golden ratio 1.618)
    scale: {
      xs: string    // 0.618rem - metadata, timestamps
      sm: string    // 0.764rem - secondary data
      base: string  // 1rem - body text
      lg: string    // 1.618rem - primary metrics
      xl: string    // 2.618rem - critical alerts
      xxl: string   // 4.236rem - major P&L displays
    }
    
    // Weights for hierarchy
    weights: {
      light: number     // 300 - background data
      regular: number   // 400 - standard text
      medium: number    // 500 - important data
      semibold: number  // 600 - alerts, headers
      bold: number      // 700 - critical values only
    }
  }
  
  // Color System - Minimal, functional palette
  colors: {
    // Grayscale foundation (Japanese ma - negative space)
    neutral: {
      0: string    // Pure white - paper background
      50: string   // Near white - subtle backgrounds
      100: string  // Light gray - dividers
      200: string  // Medium gray - secondary text
      400: string  // Dark gray - primary text
      900: string  // Near black - critical text
      1000: string // Pure black - maximum contrast
    }
    
    // Semantic colors (minimal, high contrast)
    semantic: {
      // Trading states
      profit: string      // #059669 - green, gains
      loss: string        // #DC2626 - red, losses  
      neutral: string     // #6B7280 - no change
      warning: string     // #D97706 - caution
      critical: string    // #991B1B - danger, halt
      
      // Market data
      bid: string         // #065F46 - buy pressure
      ask: string         // #7F1D1D - sell pressure
      volume: string      // #1E40AF - volume bars
      
      // System states
      active: string      // #1D4ED8 - active elements
      inactive: string    // #9CA3AF - disabled
      background: string  // #FEFEFE - main background
      surface: string     // #F9FAFB - card backgrounds
      border: string      // #E5E7EB - subtle borders
    }
  }
  
  // Spacing System - 8pt grid with golden ratio
  spacing: {
    px: string      // 1px - hairline borders
    xs: string      // 4px - tight spacing
    sm: string      // 8px - base unit
    md: string      // 16px - comfortable spacing
    lg: string      // 24px - section spacing
    xl: string      // 32px - major sections
    xxl: string     // 48px - page sections
    xxxl: string    // 64px - major divisions
  }
  
  // Swiss Grid System
  grid: {
    columns: number     // 12 column grid
    gutter: string      // 24px between columns
    margin: string      // 48px page margins
    maxWidth: string    // 1440px container
  }
  
  // Data Visualization Specifications
  dataviz: {
    // Chart dimensions following Tufte's principles
    charts: {
      sparkline: {
        width: number    // 100px - inline with text
        height: number   // 20px - text height
      }
      small: {
        width: number    // 200px - small multiple
        height: number   // 120px
      }
      medium: {
        width: number    // 400px - standard chart
        height: number   // 240px
      }
      large: {
        width: number    // 800px - detailed analysis
        height: number   // 480px
      }
    }
    
    // Line weights for maximum data-ink ratio
    strokes: {
      hairline: string    // 0.5px - grid lines
      thin: string        // 1px - data lines
      medium: string      // 2px - primary data
      thick: string       // 3px - emphasis only
    }
    
    // Opacity levels for layered information
    opacity: {
      background: number  // 0.05 - subtle backgrounds
      secondary: number   // 0.3 - supporting data
      primary: number     // 1.0 - main data
    }
  }
  
  // Animation System - Subtle, purposeful motion
  motion: {
    // Duration (Japanese concept of ma - timing)
    duration: {
      instant: string    // 0ms - data updates
      fast: string       // 150ms - state changes
      normal: string     // 300ms - transitions
      slow: string       // 500ms - major changes
    }
    
    // Easing functions
    easing: {
      linear: string     // Data updates
      easeOut: string    // UI transitions
      easeInOut: string  // Complex animations
    }
  }
  
  // Shadow System - Minimal depth
  shadows: {
    none: string
    subtle: string      // Cards, minimal elevation
    medium: string      // Modals, overlays
    strong: string      // Critical alerts only
  }
  
  // Border Radius - Minimal, functional
  radius: {
    none: string       // 0px - data tables
    sm: string         // 2px - inputs
    md: string         // 4px - cards
    lg: string         // 8px - major components
  }
}

export const tufteDesignSystem: DesignTokens = {
  typography: {
    primary: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    secondary: "'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
    accent: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    
    scale: {
      xs: '0.618rem',    // ~10px
      sm: '0.764rem',    // ~12px
      base: '1rem',      // 16px
      lg: '1.618rem',    // ~26px
      xl: '2.618rem',    // ~42px
      xxl: '4.236rem',   // ~68px
    },
    
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  
  colors: {
    neutral: {
      0: '#000000',      // Pure black
      50: '#0A0A0A',     // Near black
      100: '#1A1A1A',    // Dark gray - cards
      200: '#2A2A2A',    // Medium gray - borders
      400: '#888888',    // Light gray - secondary text
      900: '#E0E0E0',    // Near white - primary text
      1000: '#FFFFFF',   // Pure white - maximum contrast
    },
    
    semantic: {
      profit: '#10B981',      // Bright green (better contrast on dark)
      loss: '#EF4444',        // Bright red (better contrast on dark)
      neutral: '#9CA3AF',     // Neutral gray
      warning: '#F59E0B',     // Bright amber
      critical: '#DC2626',    // Critical red
      
      bid: '#10B981',         // Bright green
      ask: '#EF4444',         // Bright red
      volume: '#3B82F6',      // Bright blue
      
      active: '#3B82F6',      // Bright blue
      inactive: '#4B5563',    // Dark gray
      background: '#0A0A0A',  // Very dark background
      surface: '#1A1A1A',     // Dark card background
      border: '#2A2A2A',      // Dark border
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
    xxxl: '64px',
  },
  
  grid: {
    columns: 12,
    gutter: '24px',
    margin: '48px',
    maxWidth: '1440px',
  },
  
  dataviz: {
    charts: {
      sparkline: { width: 100, height: 20 },
      small: { width: 200, height: 120 },
      medium: { width: 400, height: 240 },
      large: { width: 800, height: 480 },
    },
    
    strokes: {
      hairline: '0.5px',
      thin: '1px',
      medium: '2px',
      thick: '3px',
    },
    
    opacity: {
      background: 0.05,
      secondary: 0.3,
      primary: 1.0,
    }
  },
  
  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    
    easing: {
      linear: 'linear',
      easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    }
  },
  
  shadows: {
    none: 'none',
    subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.07)',
    strong: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  
  radius: {
    none: '0px',
    sm: '2px',
    md: '4px',
    lg: '8px',
  }
}

// Utility functions for applying design tokens
export const ds = tufteDesignSystem

// Typography utilities
export const typography = {
  // Data hierarchy - following Lupton's principles
  display: (level: 'primary' | 'secondary' | 'critical' = 'primary') => ({
    fontFamily: ds.typography.primary,
    fontSize: level === 'critical' ? ds.typography.scale.xxl : 
              level === 'primary' ? ds.typography.scale.xl : ds.typography.scale.lg,
    fontWeight: level === 'critical' ? ds.typography.weights.bold : ds.typography.weights.semibold,
    lineHeight: 1.2,
    letterSpacing: '-0.025em',
  }),
  
  metric: (emphasis: 'primary' | 'secondary' = 'primary') => ({
    fontFamily: ds.typography.secondary,
    fontSize: emphasis === 'primary' ? ds.typography.scale.lg : ds.typography.scale.base,
    fontWeight: ds.typography.weights.medium,
    lineHeight: 1.0,
    fontFeatureSettings: '"tnum" 1', // Tabular numbers
  }),
  
  body: (size: 'sm' | 'base' | 'lg' = 'base') => ({
    fontFamily: ds.typography.accent,
    fontSize: ds.typography.scale[size],
    fontWeight: ds.typography.weights.regular,
    lineHeight: 1.5,
  }),
  
  label: () => ({
    fontFamily: ds.typography.accent,
    fontSize: ds.typography.scale.sm,
    fontWeight: ds.typography.weights.medium,
    lineHeight: 1.0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }),
}

// Layout utilities
export const layout = {
  container: () => ({
    maxWidth: ds.grid.maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: ds.grid.margin,
    paddingRight: ds.grid.margin,
  }),
  
  // Page container for use within ClientLayout (no left padding since sidebar handles offset)
  pageContainer: () => ({
    maxWidth: ds.grid.maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingRight: ds.grid.margin,
    // No paddingLeft - ClientLayout's marginLeft handles sidebar offset
  }),
  
  // Page padding for sections within ClientLayout pages
  pagePadding: () => ({
    paddingLeft: ds.spacing.sm, // Minimal left padding since sidebar offset handled by layout
    paddingRight: ds.spacing.xl,
    paddingTop: ds.spacing.xl,
    paddingBottom: ds.spacing.xl,
  }),
  
  grid: (columns: number = 12) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: ds.grid.gutter,
  }),
  
  card: () => ({
    backgroundColor: ds.colors.semantic.surface,
    border: `1px solid ${ds.colors.semantic.border}`,
    borderRadius: ds.radius.md,
    padding: ds.spacing.lg,
  }),
}

// Data visualization utilities
export const dataviz = {
  sparkline: () => ({
    width: ds.dataviz.charts.sparkline.width,
    height: ds.dataviz.charts.sparkline.height,
    stroke: ds.colors.semantic.active,
    strokeWidth: ds.dataviz.strokes.thin,
    fill: 'none',
  }),
  
  chart: (size: 'small' | 'medium' | 'large' = 'medium') => ({
    width: ds.dataviz.charts[size].width,
    height: ds.dataviz.charts[size].height,
  }),
  
  axis: () => ({
    stroke: ds.colors.neutral[200],
    strokeWidth: ds.dataviz.strokes.hairline,
  }),
  
  grid: () => ({
    stroke: ds.colors.neutral[100],
    strokeWidth: ds.dataviz.strokes.hairline,
    opacity: ds.dataviz.opacity.background,
  }),
}

export default tufteDesignSystem