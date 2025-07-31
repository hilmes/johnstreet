/**
 * Ambient Design System - Brian Eno Inspired
 * 
 * Core Principles:
 * - "Ambient music must be as ignorable as it is interesting"
 * - Generative systems that create variation within constraints
 * - Calm technology that doesn't demand attention
 * - Background processes that surface important patterns
 * - Systems that reward attention when given
 */

import { tufteDesignSystem as ds } from './TufteDesignSystem'

export interface AmbientDesignTokens {
  // Attention Layers - information hierarchy for ambient presentation
  attention: {
    background: {
      opacity: number
      animation: string
      update: string
    }
    ambient: {
      opacity: number
      animation: string
      update: string
    }
    noticed: {
      opacity: number
      animation: string
      update: string
    }
    focused: {
      opacity: number
      animation: string
      update: string
    }
    critical: {
      opacity: number
      animation: string
      update: string
    }
  }
  
  // Generative System Parameters
  generative: {
    // Data flow animation constraints
    flow: {
      minDuration: number
      maxDuration: number
      variance: number
      pulseChance: number
    }
    
    // Color generation rules
    palette: {
      baseHue: number
      saturationRange: [number, number]
      lightnessRange: [number, number]
      complementaryChance: number
    }
    
    // Layout variation parameters
    layout: {
      gridVariance: number
      spacingMultiplier: [number, number]
      asymmetryChance: number
    }
    
    // Content emergence rules
    content: {
      sparklineVariations: string[]
      transitionProbabilities: Record<string, number>
      informationDensity: [number, number]
    }
  }
  
  // Ambient States - different operating modes
  ambientStates: {
    calm: {
      updateFrequency: number
      motionIntensity: number
      colorSaturation: number
      informationDensity: number
    }
    active: {
      updateFrequency: number
      motionIntensity: number
      colorSaturation: number
      informationDensity: number
    }
    focused: {
      updateFrequency: number
      motionIntensity: number
      colorSaturation: number
      informationDensity: number
    }
    critical: {
      updateFrequency: number
      motionIntensity: number
      colorSaturation: number
      informationDensity: number
    }
  }
  
  // Breathing System - rhythmic variation in presentation
  breathing: {
    inhale: number    // expansion phase duration
    exhale: number    // contraction phase duration
    hold: number      // pause between breaths
    variance: number  // randomness in timing
  }
  
  // Emergence Patterns
  emergence: {
    // How information surfaces from background
    surfacing: {
      threshold: number
      duration: number
      easing: string
    }
    
    // How information fades to background
    submerging: {
      threshold: number
      duration: number
      easing: string
    }
    
    // Pattern recognition triggers
    patterns: {
      repetition: number
      significance: number
      novelty: number
    }
  }
}

export const ambientDesignSystem: AmbientDesignTokens = {
  attention: {
    background: {
      opacity: 0.05,
      animation: 'none',
      update: 'fade'
    },
    ambient: {
      opacity: 0.3,
      animation: 'breath',
      update: 'drift'
    },
    noticed: {
      opacity: 0.7,
      animation: 'gentle-pulse',
      update: 'surface'
    },
    focused: {
      opacity: 1.0,
      animation: 'steady',
      update: 'immediate'
    },
    critical: {
      opacity: 1.0,
      animation: 'urgent-pulse',
      update: 'immediate'
    }
  },
  
  generative: {
    flow: {
      minDuration: 2000,
      maxDuration: 8000,
      variance: 0.3,
      pulseChance: 0.1
    },
    
    palette: {
      baseHue: 220, // Blue-ish base
      saturationRange: [0.1, 0.6],
      lightnessRange: [0.2, 0.8],
      complementaryChance: 0.05
    },
    
    layout: {
      gridVariance: 0.05,
      spacingMultiplier: [0.8, 1.2],
      asymmetryChance: 0.02
    },
    
    content: {
      sparklineVariations: ['line', 'area', 'dots', 'bars'],
      transitionProbabilities: {
        'fade': 0.6,
        'slide': 0.2,
        'scale': 0.15,
        'rotate': 0.05
      },
      informationDensity: [0.3, 0.9]
    }
  },
  
  ambientStates: {
    calm: {
      updateFrequency: 5000,  // 5 seconds
      motionIntensity: 0.2,
      colorSaturation: 0.3,
      informationDensity: 0.4
    },
    active: {
      updateFrequency: 1000,  // 1 second
      motionIntensity: 0.5,
      colorSaturation: 0.6,
      informationDensity: 0.7
    },
    focused: {
      updateFrequency: 250,   // 250ms
      motionIntensity: 0.8,
      colorSaturation: 0.8,
      informationDensity: 1.0
    },
    critical: {
      updateFrequency: 100,   // 100ms
      motionIntensity: 1.0,
      colorSaturation: 1.0,
      informationDensity: 1.0
    }
  },
  
  breathing: {
    inhale: 4000,     // 4 second inhale
    exhale: 4000,     // 4 second exhale
    hold: 1000,       // 1 second pause
    variance: 0.2     // 20% timing variation
  },
  
  emergence: {
    surfacing: {
      threshold: 0.7,
      duration: 1500,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
    },
    
    submerging: {
      threshold: 0.3,
      duration: 3000,
      easing: 'cubic-bezier(0.4, 0.0, 0.6, 1)'
    },
    
    patterns: {
      repetition: 3,    // How many times something repeats to be noticed
      significance: 0.1, // Threshold for significant change (10%)
      novelty: 0.8      // Threshold for novel patterns
    }
  }
}

// Ambient utility functions
export const ambient = {
  // Generate breathing animation with variance
  breathe: (element: string, variance: number = ambientDesignSystem.breathing.variance) => {
    const { inhale, exhale, hold } = ambientDesignSystem.breathing
    const varyTime = (time: number) => time * (1 + (Math.random() - 0.5) * variance)
    
    return `
      @keyframes breathe-${element} {
        0% { transform: scale(1); opacity: 0.7; }
        ${(varyTime(inhale) / (varyTime(inhale) + varyTime(exhale) + varyTime(hold))) * 100}% { 
          transform: scale(1.02); opacity: 1; 
        }
        100% { transform: scale(1); opacity: 0.7; }
      }
    `
  },
  
  // Calculate attention level based on data significance
  getAttentionLevel: (
    value: number, 
    baseline: number, 
    thresholds: { ambient: number; noticed: number; focused: number; critical: number }
  ): keyof AmbientDesignTokens['attention'] => {
    const change = Math.abs((value - baseline) / baseline)
    
    if (change >= thresholds.critical) return 'critical'
    if (change >= thresholds.focused) return 'focused'
    if (change >= thresholds.noticed) return 'noticed'
    if (change >= thresholds.ambient) return 'ambient'
    return 'background'
  },
  
  // Generate color based on generative rules
  generateColor: (seed: number, emotion: 'calm' | 'neutral' | 'alert' | 'critical' = 'neutral') => {
    const { baseHue, saturationRange, lightnessRange } = ambientDesignSystem.generative.palette
    
    const emotionHueShift = {
      calm: -30,    // More blue/green
      neutral: 0,   // Base hue
      alert: 30,    // More yellow
      critical: 60  // More red
    }
    
    const hue = (baseHue + emotionHueShift[emotion] + (seed * 137.5) % 360) % 360
    const saturation = saturationRange[0] + (seed % 1) * (saturationRange[1] - saturationRange[0])
    const lightness = lightnessRange[0] + (seed % 1) * (lightnessRange[1] - lightnessRange[0])
    
    return `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`
  },
  
  // Create generative timing with variation
  timing: (base: number, variance: number = 0.2) => {
    return base * (1 + (Math.random() - 0.5) * variance)
  },
  
  // Determine if something should emerge based on patterns
  shouldEmerge: (history: number[], significance: number = 0.1) => {
    if (history.length < 2) return false
    
    const recent = history.slice(-5)
    const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const current = history[history.length - 1]
    
    return Math.abs((current - avg) / avg) > significance
  }
}

// Animation keyframes for ambient behaviors
export const ambientAnimations = `
  @keyframes gentle-pulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.01); }
  }
  
  @keyframes urgent-pulse {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    25% { opacity: 1; transform: scale(1.03); }
    75% { opacity: 0.9; transform: scale(0.99); }
  }
  
  @keyframes drift {
    0% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(1px) translateY(-0.5px); }
    50% { transform: translateX(0.5px) translateY(1px); }
    75% { transform: translateX(-0.5px) translateY(0.5px); }
    100% { transform: translateX(0) translateY(0); }
  }
  
  @keyframes surface {
    from { 
      opacity: 0.3; 
      transform: translateY(2px) scale(0.98); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  @keyframes submerge {
    from { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
    to { 
      opacity: 0.3; 
      transform: translateY(2px) scale(0.98); 
    }
  }
`

export default ambientDesignSystem