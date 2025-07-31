/**
 * Unified Design System Index
 * 
 * This file provides a single, consistent export interface for all design systems,
 * ensuring proper fallbacks and Edge Runtime compatibility.
 */

// Import all design systems
import { DesignSystem as LegacyDesignSystem, DesignUtils } from './DesignSystem'
import { tufteDesignSystem, ds as tufteDs, typography as tufteTypography, layout as tufteLayout, dataviz as tufteDataviz } from './TufteDesignSystem'
import { swissTrading, layout as swissLayout, typography as swissTypography, animations as swissAnimations } from './SwissTradingDesignSystem'
import { ambientDesignSystem, ambient, ambientAnimations } from './AmbientDesignSystem'

// Create a unified design system with consistent structure and fallbacks
export const unifiedDesignSystem = {
  // Core color system with fallbacks
  colors: {
    // Neutral colors (consistent across all systems)
    neutral: {
      0: '#000000',
      50: '#0A0A0A',
      100: '#1A1A1A',
      200: '#2A2A2A',
      400: '#888888',
      500: '#A1A1AA',
      600: '#71717A',
      700: '#52525B',
      800: '#3F3F46',
      900: '#E0E0E0',
      1000: '#FFFFFF',
      black: '#09090b',
      white: '#ffffff'
    },
    
    // Market/Trading colors
    market: {
      up: '#10B981',
      down: '#EF4444',
      neutral: '#9CA3AF',
      volume: '#3B82F6',
      warning: '#F59E0B'
    },
    
    // Semantic colors with fallbacks
    semantic: {
      profit: '#10B981',
      loss: '#EF4444',
      neutral: '#9CA3AF',
      warning: '#F59E0B',
      critical: '#DC2626',
      success: '#10B981',
      
      // Market specific
      bid: '#059669',
      ask: '#DC2626',
      
      // Order states
      pending: '#F59E0B',
      filled: '#10B981',
      cancelled: '#6B7280',
      rejected: '#EF4444'
    },
    
    // Surface colors
    surface: {
      background: '#0A0A0A',
      elevated: '#1A1A1A',
      overlay: '#2A2A2A',
      border: '#333333',
      borderFocus: '#555555'
    },
    
    // Background colors
    background: {
      primary: '#0A0A0A',
      secondary: '#1A1A1A',
      tertiary: '#2A2A2A',
      overlay: 'rgba(0, 0, 0, 0.05)'
    },
    
    // Text colors
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
      muted: '#888888',
      inverse: '#0A0A0A'
    },
    
    // System states
    system: {
      active: '#3B82F6',
      inactive: '#6B7280',
      focus: '#60A5FA',
      selection: '#1E40AF'
    },
    
    // Primary brand colors (fallback)
    primary: {
      50: '#e8ebf0',
      100: '#c5cdd9',
      200: '#8b99b3',
      300: '#5a6b8c',
      400: '#3d4d73',
      500: '#2e3b5f',
      600: '#242f51',
      700: '#1a2342',
      800: '#111834',
      900: '#0a0e27'
    }
  },
  
  // Typography system
  typography: {
    fonts: {
      interface: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      data: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
      display: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondary: '"JetBrains Mono", "Fira Code", "SF Mono", monospace'
    },
    
    scale: {
      xs: '0.618rem',    // ~10px
      sm: '0.764rem',    // ~12px
      base: '1rem',      // 16px
      md: '1.125rem',    // 18px
      lg: '1.618rem',    // ~26px
      xl: '2.618rem',    // ~42px
      xxl: '4.236rem',   // ~68px
      xxxl: '4.236rem'   // ~68px
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
      relaxed: 1.7,
      loose: 2
    }
  },
  
  // Spacing system (8pt grid)
  spacing: {
    px: '1px',
    0: '0',
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
    // Numeric variants for compatibility
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px'
  },
  
  // Grid system
  grid: {
    columns: 12,
    gutter: '24px',
    margin: '48px',
    maxWidth: '1440px',
    
    // Trading specific
    trading: {
      sidebar: '280px',
      orderbook: '320px',
      charts: '60%',
      panels: '40%'
    },
    
    // Breakpoints
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
      desktop: '1440px',
      ultrawide: '1920px'
    }
  },
  
  // Border radius
  radius: {
    none: '0px',
    sm: '2px',
    base: '4px',
    md: '4px',
    lg: '8px',
    full: '9999px'
  },
  
  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    focus: '0 0 0 3px rgba(59, 130, 246, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    strong: '0 10px 15px rgba(0, 0, 0, 0.1)'
  },
  
  // Animation system
  animations: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    pulse: '500ms',
    flash: '800ms',
    
    // Duration variants
    duration: {
      instant: '0ms',
      fast: '150ms',
      base: '200ms',
      normal: '300ms',
      slow: '500ms',
      slower: '500ms'
    },
    
    // Easing curves
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  // Data visualization
  dataViz: {
    sparkline: {
      height: 20,
      width: 100,
      strokeWidth: 1,
      color: '#3B82F6'
    },
    
    // Chart dimensions
    charts: {
      sparkline: { width: 100, height: 20 },
      small: { width: 200, height: 120 },
      medium: { width: 400, height: 240 },
      large: { width: 800, height: 480 }
    },
    
    // Stroke weights
    strokes: {
      hairline: '0.5px',
      thin: '1px',
      medium: '2px',
      thick: '3px'
    },
    
    // Opacity levels
    opacity: {
      background: 0.05,
      secondary: 0.3,
      primary: 1.0
    },
    
    // Chart margins
    chartMargins: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    },
    
    // Grid lines
    gridLines: {
      color: '#f4f4f5',
      strokeWidth: 1,
      strokeDasharray: '2,2'
    }
  },
  
  // Motion system
  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    
    easing: {
      linear: 'linear',
      easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
    }
  }
}

// Export the main design system as default and with specific names
export default unifiedDesignSystem
export const DesignSystem = unifiedDesignSystem
export const ds = unifiedDesignSystem

// Import DieterRamsDesignSystem for compatibility
import { dieterRamsDesign, designHelpers as dieterHelpers } from './DieterRamsDesignSystem'

// Export individual design systems for specific use cases
export {
  LegacyDesignSystem as BaseDesignSystem,
  DesignUtils,
  tufteDesignSystem,
  tufteDs,
  tufteTypography,
  tufteLayout,
  tufteDataviz,
  swissTrading,
  swissLayout,
  swissTypography,
  swissAnimations,
  ambientDesignSystem,
  ambient,
  ambientAnimations,
  dieterRamsDesign,
  dieterHelpers as designHelpers
}

// Utility functions that work in Edge Runtime
export const designUtils = {
  // Create focus state
  focusState: (color: string = unifiedDesignSystem.colors.primary[500] || '#3b82f6') => ({
    outline: 'none',
    boxShadow: `0 0 0 2px ${color}20, 0 0 0 4px ${color}10`
  }),
  
  // Generate color with opacity (Edge-safe)
  withOpacity: (color: string, opacity: number): string => {
    // Simple hex opacity conversion for Edge compatibility
    const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0')
    return color.length === 7 ? `${color}${opacityHex}` : color
  },
  
  // Calculate modular scale
  modularScale: (step: number, base: number = 16, ratio: number = 1.333): number => {
    return base * Math.pow(ratio, step)
  },
  
  // Generate vertical rhythm spacing
  verticalRhythm: (lines: number, baseLineHeight: number = 24): number => {
    return lines * baseLineHeight
  },
  
  // Apply golden ratio
  goldenRatio: (value: number, direction: 'up' | 'down' = 'up'): number => {
    const phi = 1.618033988749895
    return direction === 'up' ? value * phi : value / phi
  }
}

// Layout utilities
export const layout = {
  // Container for page content
  container: (maxWidth = unifiedDesignSystem.grid.maxWidth) => ({
    maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: unifiedDesignSystem.spacing.lg,
    paddingRight: unifiedDesignSystem.spacing.lg
  }),
  
  // Page container for use within ClientLayout
  pageContainer: () => ({
    maxWidth: unifiedDesignSystem.grid.maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingRight: unifiedDesignSystem.spacing.xl,
    paddingLeft: unifiedDesignSystem.spacing.sm
  }),
  
  // Card layout
  card: (elevated = false) => ({
    backgroundColor: elevated ? unifiedDesignSystem.colors.surface.overlay : unifiedDesignSystem.colors.surface.elevated,
    border: `1px solid ${unifiedDesignSystem.colors.surface.border}`,
    borderRadius: unifiedDesignSystem.radius.md,
    padding: unifiedDesignSystem.spacing.lg,
    boxShadow: elevated ? unifiedDesignSystem.shadows.medium : unifiedDesignSystem.shadows.subtle
  }),
  
  // Grid layout
  grid: (columns = 12, gap = unifiedDesignSystem.spacing.lg) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap
  }),
  
  // Flex utilities
  flex: {
    row: (gap = unifiedDesignSystem.spacing.md) => ({
      display: 'flex',
      flexDirection: 'row' as const,
      gap
    }),
    
    col: (gap = unifiedDesignSystem.spacing.md) => ({
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
  }
}

// Typography utilities
export const typography = {
  // Data hierarchy
  display: (level: 'primary' | 'secondary' | 'critical' = 'primary') => ({
    fontFamily: unifiedDesignSystem.typography.fonts.primary,
    fontSize: level === 'critical' ? unifiedDesignSystem.typography.scale.xxl : 
              level === 'primary' ? unifiedDesignSystem.typography.scale.xl : unifiedDesignSystem.typography.scale.lg,
    fontWeight: level === 'critical' ? unifiedDesignSystem.typography.weights.bold : unifiedDesignSystem.typography.weights.semibold,
    lineHeight: 1.2,
    letterSpacing: '-0.025em'
  }),
  
  // Metric display
  metric: (emphasis: 'primary' | 'secondary' = 'primary') => ({
    fontFamily: unifiedDesignSystem.typography.fonts.data,
    fontSize: emphasis === 'primary' ? unifiedDesignSystem.typography.scale.lg : unifiedDesignSystem.typography.scale.base,
    fontWeight: unifiedDesignSystem.typography.weights.medium,
    lineHeight: 1.0,
    fontFeatureSettings: '"tnum" 1'
  }),
  
  // Body text
  body: (size: 'sm' | 'base' | 'lg' = 'base') => ({
    fontFamily: unifiedDesignSystem.typography.fonts.interface,
    fontSize: unifiedDesignSystem.typography.scale[size],
    fontWeight: unifiedDesignSystem.typography.weights.regular,
    lineHeight: 1.5
  }),
  
  // Labels
  label: () => ({
    fontFamily: unifiedDesignSystem.typography.fonts.interface,
    fontSize: unifiedDesignSystem.typography.scale.sm,
    fontWeight: unifiedDesignSystem.typography.weights.medium,
    lineHeight: 1.0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  }),
  
  // Trading-specific utilities
  currency: (value: number, currency = 'USD', precision = 2) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      }).format(value)
    } catch {
      return `$${value.toFixed(precision)}`
    }
  },
  
  // Percentage with color
  percentage: (value: number, precision = 2) => ({
    color: value >= 0 ? unifiedDesignSystem.colors.trading.profit : unifiedDesignSystem.colors.trading.loss,
    fontFamily: unifiedDesignSystem.typography.fonts.data,
    fontWeight: unifiedDesignSystem.typography.weights.medium
  }),
  
  // Tabular numbers
  tabular: {
    fontFamily: unifiedDesignSystem.typography.fonts.data,
    fontFeatureSettings: '"tnum"',
    fontVariantNumeric: 'tabular-nums'
  }
}

// Data visualization utilities
export const dataviz = {
  sparkline: () => ({
    width: unifiedDesignSystem.dataViz.charts.sparkline.width,
    height: unifiedDesignSystem.dataViz.charts.sparkline.height,
    stroke: unifiedDesignSystem.colors.system.active,
    strokeWidth: unifiedDesignSystem.dataViz.strokes.thin,
    fill: 'none'
  }),
  
  chart: (size: 'small' | 'medium' | 'large' = 'medium') => ({
    width: unifiedDesignSystem.dataViz.charts[size].width,
    height: unifiedDesignSystem.dataViz.charts[size].height
  }),
  
  axis: () => ({
    stroke: unifiedDesignSystem.colors.neutral[200],
    strokeWidth: unifiedDesignSystem.dataViz.strokes.hairline
  }),
  
  grid: () => ({
    stroke: unifiedDesignSystem.colors.neutral[100],
    strokeWidth: unifiedDesignSystem.dataViz.strokes.hairline,
    opacity: unifiedDesignSystem.dataViz.opacity.background
  })
}