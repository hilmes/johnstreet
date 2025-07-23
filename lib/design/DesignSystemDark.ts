/**
 * Dark variant of the Design System
 * Maintains all the same design principles but optimized for dark backgrounds
 */

import { DesignSystem } from './DesignSystem'

export const DesignSystemDark = {
  ...DesignSystem,
  
  // Color System - Dark variant with true black base
  colors: {
    // Primary palette - lighter blues for dark background
    primary: {
      900: '#1e3a8a',
      800: '#1e40af',
      700: '#2563eb',
      600: '#3b82f6',
      500: '#5b7dd8',
      400: '#60a5fa',
      300: '#93bbfd',
      200: '#bfdbfe',
      100: '#dbeafe',
      50: '#eff6ff'
    },
    // Semantic colors adjusted for dark background
    market: {
      up: '#34d399',      // Softer green
      down: '#f87171',    // Softer red
      neutral: '#a1a1aa', // Lighter gray
      volume: '#60a5fa',  // Lighter blue
      warning: '#fbbf24', // Amber
    },
    // Dark mode neutrals
    neutral: {
      black: '#000000',
      950: '#0a0a0a',
      900: '#18181b',
      800: '#27272a',
      700: '#3f3f46',
      600: '#52525b',
      500: '#71717a',
      400: '#a1a1aa',
      300: '#d4d4d8',
      200: '#e4e4e7',
      100: '#f4f4f5',
      white: '#ffffff'
    },
    // Dark backgrounds
    background: {
      primary: '#000000',    // True black
      secondary: '#0a0a0a',  // Near black for cards
      tertiary: '#18181b',   // Subtle contrast
      overlay: 'rgba(255, 255, 255, 0.05)' // Light overlays
    }
  },

  // Component specific styles for dark mode
  components: {
    // Cards with minimal borders
    card: {
      padding: '24px',
      borderRadius: '4px',
      background: '#0a0a0a',
      border: '1px solid #27272a',
      boxShadow: 'none',
      hover: {
        boxShadow: '0 1px 3px 0 rgba(255, 255, 255, 0.05)',
        borderColor: '#3f3f46'
      }
    },
    // Tables with subtle lines
    table: {
      borderCollapse: 'collapse',
      fontSize: '0.875rem',
      lineHeight: 1.5,
      cell: {
        padding: '12px 16px',
        borderBottom: '1px solid #18181b',
        color: '#f4f4f5'
      },
      header: {
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        color: '#a1a1aa',
        borderBottom: '2px solid #27272a'
      }
    },
    // Buttons optimized for dark background
    button: {
      padding: '8px 16px',
      fontSize: '0.875rem',
      fontWeight: 500,
      borderRadius: '4px',
      transition: 'all 200ms ease',
      primary: {
        background: '#5b7dd8',
        color: '#000000',
        hover: {
          background: '#6f8fe3'
        }
      },
      secondary: {
        background: 'transparent',
        color: '#5b7dd8',
        border: '1px solid #3f3f46',
        hover: {
          background: '#18181b',
          borderColor: '#52525b'
        }
      }
    }
  },

  // Data visualization for dark mode
  dataViz: {
    sparkline: {
      height: 20,
      width: 100,
      strokeWidth: 1,
      color: '#60a5fa'
    },
    chartMargins: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    },
    gridLines: {
      color: '#18181b',
      strokeWidth: 1,
      strokeDasharray: '2,2'
    },
    axis: {
      color: '#27272a',
      labelColor: '#a1a1aa'
    }
  }
}

// Dark mode utility functions
export const DesignUtilsDark = {
  ...DesignSystem.DesignUtils,
  
  // Create focus state for dark mode
  focusState: (color: string = DesignSystemDark.colors.primary[500]): object => ({
    outline: 'none',
    boxShadow: `0 0 0 2px ${color}20, 0 0 0 4px ${color}10`
  }),

  // Adjust color brightness for dark mode
  adjustBrightness: (color: string, amount: number): string => {
    // Simple brightness adjustment for hex colors
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.min(255, ((num >> 16) & 255) + amount)
    const g = Math.min(255, ((num >> 8) & 255) + amount)
    const b = Math.min(255, (num & 255) + amount)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }
}