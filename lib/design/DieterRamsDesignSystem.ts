/**
 * Dieter Rams-Inspired Design System for Trading Interface
 * 
 * Core Principles:
 * 1. Good design is innovative
 * 2. Good design makes a product useful
 * 3. Good design is aesthetic
 * 4. Good design makes a product understandable
 * 5. Good design is unobtrusive
 * 6. Good design is honest
 * 7. Good design is long-lasting
 * 8. Good design is thorough down to the last detail
 * 9. Good design is environmentally friendly
 * 10. Good design is as little design as possible
 * 
 * Additional Influences:
 * - Edward Tufte: Maximum data-ink ratio
 * - Jan Tschichold: Asymmetric typography
 * - Don Norman: Affordance theory
 * - Massimo Vignelli: Limited color palette
 * - Swiss Design: Grid systems
 * - Disney: Animation principles
 * - Luke Wroblewski: Mobile-first
 * - Jakob Nielsen: Heuristic evaluation
 */

export interface AdvancedDesignTokens {
  // Golden Ratio Constants
  phi: number // 1.618
  
  // Typography System - Jan Tschichold inspired
  typography: {
    // Font families
    families: {
      data: string      // For numerical data
      interface: string // For UI elements
      reading: string   // For longer text
    }
    
    // Asymmetric scale based on golden ratio
    scale: {
      micro: string     // 0.382rem (~6px) - Tiny labels
      mini: string      // 0.618rem (~10px) - Metadata
      small: string     // 0.764rem (~12px) - Secondary text
      base: string      // 1rem (16px) - Body text
      medium: string    // 1.236rem (~20px) - Subheadings
      large: string     // 1.618rem (~26px) - Primary data
      xlarge: string    // 2.618rem (~42px) - Key metrics
      xxlarge: string   // 4.236rem (~68px) - Hero numbers
    }
    
    // Line heights for optimal readability
    lineHeights: {
      tight: number     // 1.2 - Headers
      normal: number    // 1.5 - Body
      relaxed: number   // 1.75 - Long form
      data: number      // 1.0 - Numerical data
    }
    
    // Font weights
    weights: {
      light: number
      regular: number
      medium: number
      semibold: number
      bold: number
    }
  }
  
  // Color System - Massimo Vignelli inspired minimalism
  colors: {
    // Base grayscale
    grayscale: {
      0: string    // Pure black
      5: string    // Near black
      10: string   // Dark
      20: string   // Medium dark
      30: string   // Medium
      50: string   // Mid gray
      70: string   // Light
      90: string   // Near white
      95: string   // Off white
      100: string  // Pure white
    }
    
    // Semantic colors - Limited palette
    semantic: {
      // Trading specific
      buy: string           // Green - Positive action
      sell: string          // Red - Negative action
      neutral: string       // Gray - No change
      
      // Status indicators
      success: string       // Profitable
      danger: string        // Loss/Risk
      warning: string       // Caution
      info: string          // Information
      
      // Interface states
      primary: string       // Primary actions
      secondary: string     // Secondary actions
      disabled: string      // Disabled state
      
      // Backgrounds
      background: {
        primary: string     // Main background
        secondary: string   // Card backgrounds
        tertiary: string    // Nested elements
        overlay: string     // Modal overlays
      }
      
      // Accessibility patterns
      patterns: {
        profit: string      // Pattern for colorblind
        loss: string        // Pattern for colorblind
      }
    }
  }
  
  // Spacing System - Swiss Grid
  spacing: {
    unit: number          // Base unit (8px)
    micro: string         // 0.25 * unit (2px)
    mini: string          // 0.5 * unit (4px)
    small: string         // 1 * unit (8px)
    medium: string        // 2 * unit (16px)
    large: string         // 3 * unit (24px)
    xlarge: string        // 4 * unit (32px)
    xxlarge: string       // 6 * unit (48px)
    xxxlarge: string      // 8 * unit (64px)
  }
  
  // Grid System - Swiss Design principles
  grid: {
    columns: number       // 12 column grid
    gutters: {
      mobile: string      // 16px
      tablet: string      // 24px
      desktop: string     // 32px
    }
    margins: {
      mobile: string      // 16px
      tablet: string      // 32px
      desktop: string     // 48px
    }
    maxWidth: string      // 1440px
  }
  
  // Animation - Disney principles
  animation: {
    // Durations
    durations: {
      instant: number     // 0ms - Data updates
      micro: number       // 100ms - Micro interactions
      fast: number        // 200ms - Quick transitions
      normal: number      // 300ms - Standard transitions
      slow: number        // 500ms - Complex animations
      verySlow: number    // 800ms - Page transitions
    }
    
    // Easings
    easings: {
      linear: string      // No easing
      easeIn: string      // Accelerate
      easeOut: string     // Decelerate
      easeInOut: string   // Standard
      spring: string      // Bounce effect
    }
  }
  
  // Interactive Elements - Fitts' Law
  interactive: {
    // Minimum sizes for touch targets
    minSize: {
      mobile: string      // 44px - iOS standard
      desktop: string     // 32px - Desktop standard
    }
    
    // Click/tap areas
    clickArea: {
      small: string       // 24px
      medium: string      // 32px
      large: string       // 44px
      xlarge: string      // 56px
    }
    
    // Border radius
    radius: {
      none: string        // 0px
      small: string       // 2px
      medium: string      // 4px
      large: string       // 8px
      pill: string        // 999px
    }
  }
  
  // Shadows - Minimal depth
  shadows: {
    none: string
    small: string         // Subtle elevation
    medium: string        // Cards
    large: string         // Modals
    focus: string         // Focus states
  }
  
  // Data Visualization - Tufte principles
  dataViz: {
    // Chart dimensions
    charts: {
      micro: { width: number; height: number }    // Inline sparklines
      small: { width: number; height: number }    // Dashboard widgets
      medium: { width: number; height: number }   // Standard charts
      large: { width: number; height: number }    // Detailed analysis
      full: { width: string; height: string }     // Full screen
    }
    
    // Data-ink ratio optimization
    strokes: {
      hairline: string    // 0.5px - Grid lines
      thin: string        // 1px - Secondary data
      medium: string      // 2px - Primary data
      thick: string       // 3px - Emphasis only
    }
    
    // Opacity for layering
    opacity: {
      subtle: number      // 0.1 - Backgrounds
      light: number       // 0.3 - Secondary
      medium: number      // 0.6 - Supporting
      strong: number      // 0.8 - Important
      full: number        // 1.0 - Primary
    }
  }
  
  // Responsive breakpoints
  breakpoints: {
    mobile: string        // 0-767px
    tablet: string        // 768-1023px
    desktop: string       // 1024-1439px
    wide: string          // 1440px+
  }
  
  // Z-index hierarchy
  zIndex: {
    base: number          // 0
    raised: number        // 10
    dropdown: number      // 100
    sticky: number        // 200
    fixed: number         // 300
    modal: number         // 400
    popover: number       // 500
    tooltip: number       // 600
    notification: number  // 700
    critical: number      // 999
  }
}

// Implementation
export const dieterRamsDesign: AdvancedDesignTokens = {
  phi: 1.618,
  
  typography: {
    families: {
      data: "'IBM Plex Mono', 'SF Mono', 'Monaco', monospace",
      interface: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      reading: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    
    scale: {
      micro: '0.382rem',
      mini: '0.618rem',
      small: '0.764rem',
      base: '1rem',
      medium: '1.236rem',
      large: '1.618rem',
      xlarge: '2.618rem',
      xxlarge: '4.236rem',
    },
    
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      data: 1.0,
    },
    
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  colors: {
    grayscale: {
      0: '#000000',
      5: '#0d0e14',         // Crypto dark background
      10: '#1e222d',        // Crypto surface
      20: '#2a2e39',        // Crypto border
      30: '#3a3e49',        // Slightly lighter
      50: '#787b86',        // Crypto text secondary
      70: '#a1a4ae',        // Mid light
      90: '#d1d4dc',        // Crypto text primary
      95: '#e8eaed',        // Near white
      100: '#FFFFFF',       // Pure white
    },
    
    semantic: {
      buy: '#26a69a',           // Crypto success green
      sell: '#ef5350',          // Crypto danger red
      neutral: '#787b86',       // Crypto text secondary
      
      success: '#26a69a',       // Crypto success green
      danger: '#ef5350',        // Crypto danger red
      warning: '#FFB800',
      info: '#2962ff',          // Crypto primary blue
      
      primary: '#2962ff',       // Crypto primary blue
      secondary: '#787b86',     // Crypto text secondary
      disabled: '#3a3e49',
      
      background: {
        primary: '#0d0e14',     // Crypto dark background
        secondary: '#1e222d',   // Crypto surface
        tertiary: '#2a2e39',    // Crypto border as background
        overlay: 'rgba(13, 14, 20, 0.8)',
      },
      
      patterns: {
        profit: 'url("data:image/svg+xml,%3Csvg width="4" height="4" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0L4 4M0 4L4 0" stroke="%2326a69a" stroke-width="0.5" /%3E%3C/svg%3E")',
        loss: 'url("data:image/svg+xml,%3Csvg width="4" height="4" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 2L4 2M2 0L2 4" stroke="%23ef5350" stroke-width="0.5" /%3E%3C/svg%3E")',
      },
    },
  },
  
  spacing: {
    unit: 8,
    micro: '2px',
    mini: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '48px',
    xxxlarge: '64px',
  },
  
  grid: {
    columns: 12,
    gutters: {
      mobile: '16px',
      tablet: '24px',
      desktop: '32px',
    },
    margins: {
      mobile: '16px',
      tablet: '32px',
      desktop: '48px',
    },
    maxWidth: '1440px',
  },
  
  animation: {
    durations: {
      instant: 0,
      micro: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      verySlow: 800,
    },
    
    easings: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },
  
  interactive: {
    minSize: {
      mobile: '44px',
      desktop: '32px',
    },
    
    clickArea: {
      small: '24px',
      medium: '32px',
      large: '44px',
      xlarge: '56px',
    },
    
    radius: {
      none: '0px',
      small: '2px',
      medium: '4px',
      large: '8px',
      pill: '999px',
    },
  },
  
  shadows: {
    none: 'none',
    small: '0 1px 2px rgba(0, 0, 0, 0.3)',
    medium: '0 2px 8px rgba(0, 0, 0, 0.3)',
    large: '0 8px 24px rgba(0, 0, 0, 0.4)',
    focus: '0 0 0 3px rgba(0, 132, 255, 0.5)',
  },
  
  dataViz: {
    charts: {
      micro: { width: 100, height: 20 },
      small: { width: 300, height: 150 },
      medium: { width: 600, height: 300 },
      large: { width: 900, height: 450 },
      full: { width: '100%', height: '100%' },
    },
    
    strokes: {
      hairline: '0.5px',
      thin: '1px',
      medium: '2px',
      thick: '3px',
    },
    
    opacity: {
      subtle: 0.1,
      light: 0.3,
      medium: 0.6,
      strong: 0.8,
      full: 1.0,
    },
  },
  
  breakpoints: {
    mobile: '767px',
    tablet: '1023px',
    desktop: '1439px',
    wide: '1440px',
  },
  
  zIndex: {
    base: 0,
    raised: 10,
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modal: 400,
    popover: 500,
    tooltip: 600,
    notification: 700,
    critical: 999,
  },
}

// Helper functions for common patterns
export const designHelpers = {
  // Golden ratio calculations
  goldenRatio: (base: number, steps: number = 1): number => {
    return base * Math.pow(dieterRamsDesign.phi, steps)
  },
  
  // Responsive value helper
  responsive: <T,>(mobile: T, tablet?: T, desktop?: T): { mobile: T; tablet: T; desktop: T } => ({
    mobile,
    tablet: tablet ?? mobile,
    desktop: desktop ?? tablet ?? mobile,
  }),
  
  // Accessibility contrast checker
  meetsWCAG: (fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    // Implementation would calculate contrast ratio
    // Placeholder for now
    return true
  },
  
  // Animation timing function
  animate: (property: string, duration: number = 300, easing: string = 'easeOut'): string => {
    return `${property} ${duration}ms ${dieterRamsDesign.animation.easings[easing as keyof typeof dieterRamsDesign.animation.easings] || easing}`
  },
}