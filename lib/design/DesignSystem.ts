/**
 * Design System based on principles from:
 * - Edward Tufte (data-ink ratio, clarity)
 * - Swiss Design (grid systems, hierarchy)
 * - Japanese Aesthetics (ma, wabi-sabi, kanso)
 * - Ellen Lupton (typography as language)
 * - Dieter Rams (less but better)
 */

export const DesignSystem = {
  // Swiss Grid System - Based on Müller-Brockmann
  grid: {
    columns: 12,
    gutter: 16,
    margin: 24,
    // Golden ratio for vertical rhythm
    baseUnit: 8,
    verticalRhythm: {
      xs: 8,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
      xxl: 64
    }
  },

  // Typography - Ellen Lupton's principles
  typography: {
    // Primary: Clean sans-serif for data
    primary: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    // Secondary: Highly legible for analysis
    secondary: {
      fontFamily: '"IBM Plex Mono", "SF Mono", Monaco, Consolas, monospace',
      weights: {
        regular: 400,
        medium: 500
      }
    },
    // Scale based on perfect fourth (1.333)
    scale: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      md: '1.125rem',   // 18px
      lg: '1.333rem',   // 21.33px
      xl: '1.777rem',   // 28.44px
      xxl: '2.369rem',  // 37.90px
      xxxl: '3.157rem'  // 50.52px
    },
    // Leading for optimal readability
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2
    }
  },

  // Color System - Inspired by Japanese restraint
  colors: {
    // Primary palette - muted, sophisticated
    primary: {
      // Deep ink blue - main brand color
      900: '#0a0e27',
      800: '#111834',
      700: '#1a2342',
      600: '#242f51',
      500: '#2e3b5f',
      400: '#3d4d73',
      300: '#5a6b8c',
      200: '#8b99b3',
      100: '#c5cdd9',
      50: '#e8ebf0'
    },
    // Semantic colors for market data
    market: {
      up: '#22c55e',      // Green for gains
      down: '#ef4444',    // Red for losses
      neutral: '#6b7280', // Gray for no change
      volume: '#3b82f6',  // Blue for volume
      warning: '#f59e0b', // Amber for alerts
    },
    // Japanese-inspired neutrals
    neutral: {
      black: '#09090b',
      950: '#18181b',
      900: '#27272a',
      800: '#3f3f46',
      700: '#52525b',
      600: '#71717a',
      500: '#a1a1aa',
      400: '#d4d4d8',
      300: '#e4e4e7',
      200: '#f4f4f5',
      100: '#fafafa',
      white: '#ffffff'
    },
    // Ma (negative space) - background colors
    background: {
      primary: '#fafafa',    // Main background
      secondary: '#ffffff',  // Card background
      tertiary: '#f4f4f5',   // Subtle contrast
      overlay: 'rgba(0, 0, 0, 0.05)' // Gentle overlays
    }
  },

  // Spacing - Based on 8pt grid
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
  },

  // Border radius - Subtle, not decorative
  radius: {
    none: '0',
    sm: '0.125rem',  // 2px
    base: '0.25rem', // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    full: '9999px'
  },

  // Shadows - Minimal, functional
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },

  // Animation - Subtle, purposeful
  animation: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms'
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },

  // Component specific styles
  components: {
    // Cards with Japanese ma (negative space)
    card: {
      padding: '24px',
      borderRadius: '4px',
      background: '#ffffff',
      border: '1px solid #e4e4e7',
      boxShadow: 'none', // Flat design
      hover: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }
    },
    // Tables following Tufte's principles
    table: {
      borderCollapse: 'collapse',
      fontSize: '0.875rem',
      lineHeight: 1.5,
      cell: {
        padding: '12px 16px',
        borderBottom: '1px solid #f4f4f5'
      },
      header: {
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        color: '#71717a'
      }
    },
    // Buttons - functional, not decorative
    button: {
      padding: '8px 16px',
      fontSize: '0.875rem',
      fontWeight: 500,
      borderRadius: '4px',
      transition: 'all 200ms ease',
      primary: {
        background: '#2e3b5f',
        color: '#ffffff',
        hover: {
          background: '#242f51'
        }
      },
      secondary: {
        background: 'transparent',
        color: '#2e3b5f',
        border: '1px solid #e4e4e7',
        hover: {
          background: '#fafafa'
        }
      }
    }
  },

  // Data visualization principles
  dataViz: {
    // Tufte's sparkline dimensions
    sparkline: {
      height: 20,
      width: 100,
      strokeWidth: 1,
      color: '#3b82f6'
    },
    // Chart margins for clean data presentation
    chartMargins: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    },
    // Grid lines - subtle, not dominant
    gridLines: {
      color: '#f4f4f5',
      strokeWidth: 1,
      strokeDasharray: '2,2'
    }
  }
}

// Utility functions for applying design principles
export const DesignUtils = {
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
  },

  // Generate color with opacity
  withOpacity: (color: string, opacity: number): string => {
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
  },

  // Create focus state that respects minimalism
  focusState: (color: string = DesignSystem.colors.primary[500]): object => ({
    outline: 'none',
    boxShadow: `0 0 0 2px ${color}20, 0 0 0 4px ${color}10`
  })
}