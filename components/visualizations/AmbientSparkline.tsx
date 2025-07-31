/**
 * Ambient Sparkline - Generative Data Visualization
 * 
 * Inspired by Brian Eno's ambient music principles:
 * - Generative variations within constraints
 * - Ambient presence that can be ignored or attended to
 * - Breathing rhythm that creates natural variation
 * - Emergence of patterns through subtle changes
 */

'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ambientDesignSystem as ambient, ambientAnimations } from '@/lib/design/AmbientDesignSystem'
import { ds } from '@/lib/design/TufteDesignSystem'

interface AmbientSparklineProps {
  data: number[]
  symbol?: string
  width?: number
  height?: number
  baseColor?: string
  attentionThresholds?: {
    ambient: number
    noticed: number
    focused: number
    critical: number
  }
  className?: string
  style?: React.CSSProperties
  breathingEnabled?: boolean
  generativeMode?: boolean
}

interface GenerativeState {
  variation: 'line' | 'area' | 'dots' | 'bars'
  colorShift: number
  breathingPhase: 'inhale' | 'exhale' | 'hold'
  attentionLevel: keyof typeof ambient.attention
  lastSignificantChange: number
  patternMemory: number[]
}

export const AmbientSparkline: React.FC<AmbientSparklineProps> = ({
  data,
  symbol = '',
  width = 100,
  height = 20,
  baseColor,
  attentionThresholds = {
    ambient: 0.01,   // 1% change
    noticed: 0.03,   // 3% change
    focused: 0.05,   // 5% change
    critical: 0.1    // 10% change
  },
  className = '',
  style = {},
  breathingEnabled = true,
  generativeMode = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [generativeState, setGenerativeState] = useState<GenerativeState>({
    variation: 'line',
    colorShift: 0,
    breathingPhase: 'inhale',
    attentionLevel: 'ambient',
    lastSignificantChange: 0,
    patternMemory: []
  })

  // Calculate current attention level based on data changes
  const currentAttentionLevel = useMemo(() => {
    if (data.length < 2) return 'background'
    
    const current = data[data.length - 1]
    const previous = data[data.length - 2]
    const baseline = data.reduce((sum, val) => sum + val, 0) / data.length
    
    return ambient.getAttentionLevel(current, baseline, attentionThresholds)
  }, [data, attentionThresholds])

  // Generative system - evolves visualization over time
  useEffect(() => {
    if (!generativeMode) return

    const evolveVisualization = () => {
      setGenerativeState(prev => {
        const shouldChangeVariation = Math.random() < 0.1 // 10% chance
        const shouldShiftColor = Math.random() < 0.3 // 30% chance
        
        // Pattern detection - look for repeating behaviors
        const recentData = data.slice(-10)
        const hasPattern = recentData.length > 3 && 
          recentData.every((val, i) => i === 0 || Math.abs(val - recentData[i-1]) < attentionThresholds.ambient)

        return {
          ...prev,
          variation: shouldChangeVariation ? 
            ambient.generative.content.sparklineVariations[
              Math.floor(Math.random() * ambient.generative.content.sparklineVariations.length)
            ] as GenerativeState['variation'] : prev.variation,
          colorShift: shouldShiftColor ? Math.random() * 60 - 30 : prev.colorShift, // ±30 degrees
          attentionLevel: currentAttentionLevel,
          patternMemory: hasPattern ? [...prev.patternMemory, Date.now()] : prev.patternMemory.slice(-5)
        }
      })
    }

    const interval = setInterval(evolveVisualization, ambient.timing(8000, 0.5)) // 8±4 seconds
    return () => clearInterval(interval)
  }, [data, generativeMode, currentAttentionLevel])

  // Breathing animation system
  useEffect(() => {
    if (!breathingEnabled) return

    const breathingCycle = () => {
      const { inhale, exhale, hold, variance } = ambient.breathing
      
      const phases = [
        { phase: 'inhale', duration: ambient.timing(inhale, variance) },
        { phase: 'hold', duration: ambient.timing(hold, variance) },
        { phase: 'exhale', duration: ambient.timing(exhale, variance) },
        { phase: 'hold', duration: ambient.timing(hold, variance) }
      ]

      let currentPhaseIndex = 0
      
      const nextPhase = () => {
        setGenerativeState(prev => ({
          ...prev,
          breathingPhase: phases[currentPhaseIndex].phase as GenerativeState['breathingPhase']
        }))
        
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length
        setTimeout(nextPhase, phases[currentPhaseIndex].duration)
      }

      nextPhase()
    }

    breathingCycle()
  }, [breathingEnabled])

  // Generate SVG path data
  const pathData = useMemo(() => {
    if (!data || data.length === 0) return ''

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return { x, y, value }
    })

    // Apply generative variation to path
    const variance = ambient.generative.layout.gridVariance
    const variedPoints = points.map(point => ({
      ...point,
      x: point.x + (Math.random() - 0.5) * variance * width,
      y: point.y + (Math.random() - 0.5) * variance * height
    }))

    return variedPoints.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${path} ${command} ${point.x} ${point.y}`
    }, '').trim()
  }, [data, width, height, generativeState.variation])

  // Calculate colors based on generative state
  const colors = useMemo(() => {
    const attentionConfig = ambient.attention[generativeState.attentionLevel]
    const seed = data.length > 0 ? data[data.length - 1] : 0
    
    const emotion = generativeState.attentionLevel === 'critical' ? 'critical' :
                    generativeState.attentionLevel === 'focused' ? 'alert' :
                    generativeState.attentionLevel === 'noticed' ? 'neutral' : 'calm'
    
    const baseColor = ambient.generateColor(seed + generativeState.colorShift, emotion)
    const areaColor = baseColor.replace(')', ', 0.2)')
    
    return {
      line: baseColor,
      area: areaColor,
      opacity: attentionConfig.opacity
    }
  }, [data, generativeState])

  // Animation styles based on current state
  const animationStyle = useMemo(() => {
    const attentionConfig = ambient.attention[generativeState.attentionLevel]
    const breathingScale = generativeState.breathingPhase === 'inhale' ? 1.01 : 
                          generativeState.breathingPhase === 'exhale' ? 0.99 : 1

    return {
      opacity: colors.opacity,
      transform: `scale(${breathingScale})`,
      transition: `all ${ds.motion.duration.normal} ${ds.motion.easing.easeInOut}`,
      animation: attentionConfig.animation !== 'none' ? 
        `${attentionConfig.animation} ${ambient.timing(4000)}ms infinite ease-in-out` : 'none'
    }
  }, [generativeState, colors.opacity])

  if (!data || data.length === 0) return null

  return (
    <div 
      className={`ambient-sparkline ${className}`}
      style={{
        display: 'inline-block',
        ...style
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: ambientAnimations }} />
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={animationStyle}
        className={`sparkline-${generativeState.variation}`}
      >
        {/* Background pattern for ambient mode */}
        {generativeState.attentionLevel === 'background' && (
          <defs>
            <pattern id="ambient-dots" patternUnits="userSpaceOnUse" width="4" height="4">
              <circle cx="2" cy="2" r="0.5" fill={colors.line} opacity="0.1" />
            </pattern>
          </defs>
        )}
        
        {/* Area fill for certain variations */}
        {(generativeState.variation === 'area' || generativeState.attentionLevel === 'focused') && (
          <path
            d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
            fill={colors.area}
            stroke="none"
          />
        )}
        
        {/* Main path */}
        {generativeState.variation !== 'dots' && generativeState.variation !== 'bars' && (
          <path
            d={pathData}
            fill="none"
            stroke={colors.line}
            strokeWidth={generativeState.attentionLevel === 'critical' ? 2 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={colors.opacity}
          />
        )}
        
        {/* Dots variation */}
        {generativeState.variation === 'dots' && data.map((value, index) => {
          const min = Math.min(...data)
          const max = Math.max(...data)
          const range = max - min || 1
          const x = (index / (data.length - 1)) * width
          const y = height - ((value - min) / range) * height
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={generativeState.attentionLevel === 'critical' ? 2 : 1}
              fill={colors.line}
              opacity={colors.opacity}
            />
          )
        })}
        
        {/* Bars variation */}
        {generativeState.variation === 'bars' && data.map((value, index) => {
          const min = Math.min(...data)
          const max = Math.max(...data)
          const range = max - min || 1
          const barWidth = width / data.length * 0.8
          const barHeight = Math.max(1, (value - min) / range * height)
          const x = (index / (data.length - 1)) * width - barWidth / 2
          const y = height - barHeight
          
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={colors.line}
              opacity={colors.opacity * 0.8}
            />
          )
        })}
        
        {/* Pattern emergence indicators */}
        {generativeState.patternMemory.length > 2 && (
          <circle
            cx={width - 3}
            cy={3}
            r="1"
            fill={ambient.generateColor(Date.now(), 'neutral')}
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </svg>
      
      {/* Symbol label that appears on focused attention */}
      {symbol && generativeState.attentionLevel !== 'background' && (
        <span 
          style={{
            fontSize: ds.typography.scale.xs,
            color: colors.line,
            marginLeft: ds.spacing.xs,
            opacity: generativeState.attentionLevel === 'focused' ? 1 : 0.7,
            transition: `opacity ${ds.motion.duration.normal}`
          }}
        >
          {symbol}
        </span>
      )}
    </div>
  )
}

export default AmbientSparkline