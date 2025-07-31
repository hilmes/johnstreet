/**
 * Ambient Color System
 * 
 * Generates calming, context-aware color palettes based on:
 * - Market conditions and data patterns
 * - User attention states
 * - Time of day and circadian rhythms
 * - Breathing cycles and natural variation
 * 
 * Inspired by Brian Eno's generative music principles
 */

import { ambientDesignSystem as ambient } from './AmbientDesignSystem'

export interface ColorContext {
  marketVolatility: number    // 0-1, affects saturation and warmth
  userAttention: number       // 0-1, affects brightness and contrast
  timeOfDay: number          // 0-24, affects color temperature
  dataIntensity: number      // 0-1, affects color complexity
  breathingPhase: 'inhale' | 'exhale' | 'hold'
  emotionalTone: 'calm' | 'neutral' | 'alert' | 'critical'
}

export interface AmbientColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  success: string
  warning: string
  error: string
  info: string
  
  // Generative variations
  sparkline: string
  data: string[]
  ambient: string[]
}

export class AmbientColorSystem {
  private static baseHues = {
    calm: 220,     // Blue
    neutral: 200,  // Blue-gray
    alert: 35,     // Orange
    critical: 0    // Red
  }

  // Generate base color with natural variation
  static generateBaseColor(
    seed: number, 
    context: Partial<ColorContext> = {}
  ): { h: number; s: number; l: number } {
    const {
      marketVolatility = 0.1,
      userAttention = 0.5,
      timeOfDay = 12,
      emotionalTone = 'neutral',
      breathingPhase = 'hold'
    } = context

    // Base hue from emotional tone
    const baseHue = this.baseHues[emotionalTone]
    
    // Natural variation based on seed (golden angle for even distribution)
    const goldenAngle = 137.5
    const hueVariation = (seed * goldenAngle) % 60 - 30 // ±30 degrees
    
    // Time of day influence (warmer during day, cooler at night)
    const timeInfluence = Math.sin((timeOfDay / 24) * Math.PI * 2) * 20
    
    // Breathing influence (subtle shifts)
    const breathingInfluence = breathingPhase === 'inhale' ? 5 : 
                               breathingPhase === 'exhale' ? -5 : 0
    
    const finalHue = (baseHue + hueVariation + timeInfluence + breathingInfluence + 360) % 360

    // Saturation based on market volatility and user attention
    const baseSaturation = 0.15 + (marketVolatility * 0.4) + (userAttention * 0.3)
    const saturationVariation = (Math.sin(seed * 2.1) * 0.1)
    const finalSaturation = Math.max(0.05, Math.min(0.8, baseSaturation + saturationVariation))

    // Lightness based on attention and time
    const baseLightness = 0.4 + (userAttention * 0.3)
    const timeAdjustment = (timeOfDay < 6 || timeOfDay > 20) ? -0.1 : 0 // Darker at night
    const lightnessVariation = Math.sin(seed * 1.7) * 0.1
    const finalLightness = Math.max(0.2, Math.min(0.8, baseLightness + timeAdjustment + lightnessVariation))

    return {
      h: finalHue,
      s: finalSaturation,
      l: finalLightness
    }
  }

  // Generate harmonious color relationships
  static generateHarmonicColors(
    baseColor: { h: number; s: number; l: number },
    count: number = 5
  ): Array<{ h: number; s: number; l: number }> {
    const colors = [baseColor]
    
    // Generate colors using musical harmony ratios
    const harmonicRatios = [1.2, 1.5, 1.618, 2.0] // Perfect fifth, golden ratio, etc.
    
    for (let i = 1; i < count; i++) {
      const ratio = harmonicRatios[(i - 1) % harmonicRatios.length]
      const hueShift = (ratio * 60) % 360
      
      colors.push({
        h: (baseColor.h + hueShift) % 360,
        s: baseColor.s * (0.8 + Math.sin(i) * 0.2), // Slight saturation variation
        l: baseColor.l * (0.9 + Math.cos(i) * 0.2)  // Slight lightness variation
      })
    }
    
    return colors
  }

  // Create ambient palette from context
  static createAmbientPalette(context: ColorContext, seed: number = Date.now()): AmbientColorPalette {
    const baseColor = this.generateBaseColor(seed, context)
    const harmonicColors = this.generateHarmonicColors(baseColor, 8)
    
    // Convert HSL to CSS strings
    const toHSL = (color: { h: number; s: number; l: number }) => 
      `hsl(${Math.round(color.h)}, ${Math.round(color.s * 100)}%, ${Math.round(color.l * 100)}%)`
    
    // Create palette with semantic mappings
    const palette: AmbientColorPalette = {
      primary: toHSL(harmonicColors[0]),
      secondary: toHSL({
        ...harmonicColors[1],
        s: harmonicColors[1].s * 0.7,
        l: harmonicColors[1].l * 1.1
      }),
      accent: toHSL({
        ...harmonicColors[2],
        s: harmonicColors[2].s * 1.2,
        l: harmonicColors[2].l * 0.9
      }),
      
      // Background colors (desaturated)
      background: toHSL({
        ...baseColor,
        s: baseColor.s * 0.1,
        l: context.timeOfDay < 6 || context.timeOfDay > 20 ? 0.05 : 0.95
      }),
      surface: toHSL({
        ...baseColor,
        s: baseColor.s * 0.15,
        l: context.timeOfDay < 6 || context.timeOfDay > 20 ? 0.08 : 0.92
      }),
      
      // Text color (high contrast)
      text: toHSL({
        ...baseColor,
        s: baseColor.s * 0.2,
        l: context.timeOfDay < 6 || context.timeOfDay > 20 ? 0.9 : 0.1
      }),
      
      // Semantic colors adjusted for context
      success: toHSL({
        h: 120 + (context.breathingPhase === 'inhale' ? 10 : -5),
        s: 0.4 + context.marketVolatility * 0.3,
        l: 0.4 + context.userAttention * 0.2
      }),
      warning: toHSL({
        h: 45 + (context.breathingPhase === 'exhale' ? -5 : 5),
        s: 0.6 + context.marketVolatility * 0.2,
        l: 0.5 + context.userAttention * 0.1
      }),
      error: toHSL({
        h: 0 + (context.marketVolatility * 20),
        s: 0.7 + context.marketVolatility * 0.2,
        l: 0.45 + context.userAttention * 0.15
      }),
      info: toHSL(harmonicColors[3]),
      
      // Data visualization colors
      sparkline: toHSL({
        ...harmonicColors[0],
        s: harmonicColors[0].s * (1 + context.dataIntensity * 0.5),
        l: harmonicColors[0].l * (1 + context.userAttention * 0.2)
      }),
      
      // Array of colors for multi-series data
      data: harmonicColors.slice(0, 5).map(toHSL),
      
      // Ambient background colors (very subtle)
      ambient: harmonicColors.map(color => toHSL({
        ...color,
        s: color.s * 0.1,
        l: color.l * (context.timeOfDay < 6 || context.timeOfDay > 20 ? 0.3 : 1.3)
      }))
    }
    
    return palette
  }

  // Generate real-time color variations
  static generateColorVariation(
    baseColor: string,
    intensity: number = 0.1
  ): string {
    // Extract HSL values from CSS string
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!hslMatch) return baseColor
    
    const [, h, s, l] = hslMatch.map(Number)
    
    // Add small random variations
    const newH = (h + (Math.random() - 0.5) * intensity * 60 + 360) % 360
    const newS = Math.max(0, Math.min(100, s + (Math.random() - 0.5) * intensity * 20))
    const newL = Math.max(0, Math.min(100, l + (Math.random() - 0.5) * intensity * 10))
    
    return `hsl(${Math.round(newH)}, ${Math.round(newS)}%, ${Math.round(newL)}%)`
  }

  // Create breathing color animation
  static createBreathingAnimation(
    baseColor: string,
    intensity: number = 0.05
  ): { inhale: string; exhale: string; hold: string } {
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!hslMatch) return { inhale: baseColor, exhale: baseColor, hold: baseColor }
    
    const [, h, s, l] = hslMatch.map(Number)
    
    return {
      inhale: `hsl(${h}, ${Math.round(s * (1 + intensity))}%, ${Math.round(l * (1 + intensity / 2))})`,
      exhale: `hsl(${h}, ${Math.round(s * (1 - intensity / 2))}%, ${Math.round(l * (1 - intensity / 3))})`,
      hold: baseColor
    }
  }

  // Generate market-responsive colors
  static getMarketColor(
    value: number,
    baseline: number,
    context: Partial<ColorContext> = {}
  ): string {
    const change = (value - baseline) / baseline
    const volatility = context.marketVolatility || Math.abs(change)
    
    // Determine color based on change magnitude and direction
    if (Math.abs(change) < 0.001) {
      // Neutral/stable
      return this.generateBaseColor(value, { ...context, emotionalTone: 'neutral' }).l > 0.5 ?
        `hsl(200, 10%, 50%)` : `hsl(200, 10%, 70%)`
    }
    
    const isPositive = change > 0
    const intensity = Math.min(1, Math.abs(change) * 10) // Scale to 0-1
    
    const hue = isPositive ? 120 : 0 // Green for positive, red for negative
    const saturation = Math.round(30 + intensity * 40) // 30-70%
    const lightness = Math.round(45 + (context.userAttention || 0.5) * 20) // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  // Create time-sensitive color schedule
  static createColorSchedule(context: Omit<ColorContext, 'timeOfDay'>): Map<number, AmbientColorPalette> {
    const schedule = new Map<number, AmbientColorPalette>()
    
    // Generate palettes for different times of day
    const keyTimes = [0, 6, 9, 12, 15, 18, 21] // Key points in circadian rhythm
    
    keyTimes.forEach(hour => {
      const timeContext = { ...context, timeOfDay: hour }
      const palette = this.createAmbientPalette(timeContext)
      schedule.set(hour, palette)
    })
    
    return schedule
  }

  // Interpolate between color palettes
  static interpolatePalettes(
    palette1: AmbientColorPalette,
    palette2: AmbientColorPalette,
    factor: number // 0-1
  ): AmbientColorPalette {
    const interpolateColor = (color1: string, color2: string, f: number): string => {
      const hsl1 = color1.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)?.slice(1).map(Number)
      const hsl2 = color2.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)?.slice(1).map(Number)
      
      if (!hsl1 || !hsl2) return color1
      
      const [h1, s1, l1] = hsl1
      const [h2, s2, l2] = hsl2
      
      // Handle hue interpolation (circular)
      let hDiff = h2 - h1
      if (hDiff > 180) hDiff -= 360
      if (hDiff < -180) hDiff += 360
      
      const h = Math.round((h1 + hDiff * f + 360) % 360)
      const s = Math.round(s1 + (s2 - s1) * f)
      const l = Math.round(l1 + (l2 - l1) * f)
      
      return `hsl(${h}, ${s}%, ${l}%)`
    }
    
    return {
      primary: interpolateColor(palette1.primary, palette2.primary, factor),
      secondary: interpolateColor(palette1.secondary, palette2.secondary, factor),
      accent: interpolateColor(palette1.accent, palette2.accent, factor),
      background: interpolateColor(palette1.background, palette2.background, factor),
      surface: interpolateColor(palette1.surface, palette2.surface, factor),
      text: interpolateColor(palette1.text, palette2.text, factor),
      success: interpolateColor(palette1.success, palette2.success, factor),
      warning: interpolateColor(palette1.warning, palette2.warning, factor),
      error: interpolateColor(palette1.error, palette2.error, factor),
      info: interpolateColor(palette1.info, palette2.info, factor),
      sparkline: interpolateColor(palette1.sparkline, palette2.sparkline, factor),
      data: palette1.data.map((color, i) => 
        interpolateColor(color, palette2.data[i] || color, factor)
      ),
      ambient: palette1.ambient.map((color, i) => 
        interpolateColor(color, palette2.ambient[i] || color, factor)
      )
    }
  }
}

export default AmbientColorSystem