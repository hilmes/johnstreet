/**
 * Ambient Data Flow Visualization
 * 
 * Creates a generative system for visualizing data streams that:
 * - Operates as "musical" background process
 * - Uses probability and constraints to create endless variation
 * - Surfaces important patterns without interrupting focus
 * - Follows Eno's "scenius" - emergent behavior from simple rules
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ambientDesignSystem as ambient, ambientAnimations } from '@/lib/design/AmbientDesignSystem'
import { ds } from '@/lib/design/TufteDesignSystem'

interface DataStream {
  id: string
  name: string
  values: number[]
  color?: string
  significance: number // 0-1, affects visual prominence
  velocity: number     // Updates per second
  pattern?: 'stable' | 'volatile' | 'trending' | 'oscillating'
}

interface FlowParticle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  age: number
  maxAge: number
  size: number
  color: string
  opacity: number
  stream: string
  value: number
}

interface AmbientDataFlowProps {
  streams: DataStream[]
  width?: number
  height?: number
  maxParticles?: number
  ambientState?: keyof typeof ambient.ambientStates
  showLabels?: boolean
  interactive?: boolean
  onPatternDetected?: (pattern: string, data: any) => void
  className?: string
}

interface FlowState {
  particles: FlowParticle[]
  fieldForces: Array<{ x: number; y: number; strength: number; radius: number }>
  emergentPatterns: Map<string, { strength: number; lastSeen: number }>
  breathing: 'inhale' | 'exhale' | 'hold'
  focus: { x: number; y: number; radius: number; strength: number }
  generativePhase: number // 0-1, cycles through different visual modes
}

export const AmbientDataFlow: React.FC<AmbientDataFlowProps> = ({
  streams,
  width = 600,
  height = 400,
  maxParticles = 200,
  ambientState = 'calm',
  showLabels = true,
  interactive = true,
  onPatternDetected,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [flowState, setFlowState] = useState<FlowState>({
    particles: [],
    fieldForces: [],
    emergentPatterns: new Map(),
    breathing: 'inhale',
    focus: { x: width / 2, y: height / 2, radius: 50, strength: 0.1 },
    generativePhase: 0
  })

  const stateConfig = ambient.ambientStates[ambientState]

  // Generate particles from data streams
  const generateParticle = useCallback((stream: DataStream): FlowParticle | null => {
    if (stream.values.length === 0) return null

    const latestValue = stream.values[stream.values.length - 1]
    const normalizedValue = Math.abs(latestValue % 1) // Normalize to 0-1
    
    // Generative spawn rules based on data patterns
    const spawnProbability = stream.significance * stateConfig.motionIntensity
    if (Math.random() > spawnProbability) return null

    // Spawn position influenced by stream pattern
    const spawnX = stream.pattern === 'trending' ? 
      Math.random() * width * 0.2 : // Left side for trending
      stream.pattern === 'volatile' ?
      Math.random() * width : // Anywhere for volatile
      width * 0.4 + Math.random() * width * 0.2 // Center for stable

    const spawnY = height * (0.2 + stream.significance * 0.6)

    // Velocity influenced by data characteristics
    const baseVelocity = stream.velocity * stateConfig.motionIntensity
    const vx = (Math.random() - 0.5) * baseVelocity * 2
    const vy = (Math.random() - 0.5) * baseVelocity

    return {
      id: `${stream.id}_${Date.now()}_${Math.random()}`,
      x: spawnX,
      y: spawnY,
      vx,
      vy,
      age: 0,
      maxAge: ambient.timing(5000, 0.5), // 5±2.5 seconds
      size: 1 + normalizedValue * 3,
      color: stream.color || ambient.generateColor(latestValue, 
        stream.pattern === 'volatile' ? 'critical' : 'calm'),
      opacity: 0.6 + stream.significance * 0.4,
      stream: stream.id,
      value: latestValue
    }
  }, [stateConfig, width, height])

  // Physics simulation with generative forces
  const updateParticles = useCallback((particles: FlowParticle[], deltaTime: number) => {
    return particles
      .map(particle => {
        // Age particle
        const newAge = particle.age + deltaTime
        if (newAge > particle.maxAge) return null

        // Calculate forces
        let fx = 0, fy = 0

        // Gravity well at focus point
        const dx = flowState.focus.x - particle.x
        const dy = flowState.focus.y - particle.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < flowState.focus.radius) {
          const force = flowState.focus.strength * (1 - distance / flowState.focus.radius)
          fx += (dx / distance) * force * 50
          fy += (dy / distance) * force * 50
        }

        // Field forces (generative turbulence)
        flowState.fieldForces.forEach(field => {
          const fdx = field.x - particle.x
          const fdy = field.y - particle.y
          const fdist = Math.sqrt(fdx * fdx + fdy * fdy)
          
          if (fdist < field.radius) {
            const fieldForce = field.strength * (1 - fdist / field.radius)
            fx += Math.sin(particle.age * 0.001 + fdist * 0.1) * fieldForce * 20
            fy += Math.cos(particle.age * 0.001 + fdist * 0.1) * fieldForce * 20
          }
        })

        // Stream-specific behavior
        const stream = streams.find(s => s.id === particle.stream)
        if (stream) {
          // Pattern-based movement
          switch (stream.pattern) {
            case 'oscillating':
              fx += Math.sin(particle.age * 0.003) * 10
              fy += Math.cos(particle.age * 0.002) * 5
              break
            case 'trending':
              fx += stream.significance * 15 // Drift right for trending
              break
            case 'volatile':
              fx += (Math.random() - 0.5) * 20
              fy += (Math.random() - 0.5) * 20
              break
          }
        }

        // Breathing influence
        const breathingForce = flowState.breathing === 'inhale' ? 1.02 : 
                              flowState.breathing === 'exhale' ? 0.98 : 1
        fx *= breathingForce
        fy *= breathingForce

        // Update velocity and position
        const newVx = particle.vx + fx * deltaTime * 0.001
        const newVy = particle.vy + fy * deltaTime * 0.001
        
        // Damping
        const dampingFactor = 0.995
        const finalVx = newVx * dampingFactor
        const finalVy = newVy * dampingFactor

        const newX = particle.x + finalVx * deltaTime * 0.1
        const newY = particle.y + finalVy * deltaTime * 0.1

        // Boundary conditions (wrap around)
        const wrappedX = newX < 0 ? width : newX > width ? 0 : newX
        const wrappedY = newY < 0 ? height : newY > height ? 0 : newY

        // Update opacity based on age
        const ageRatio = newAge / particle.maxAge
        const newOpacity = particle.opacity * (1 - ageRatio * 0.5)

        return {
          ...particle,
          x: wrappedX,
          y: wrappedY,
          vx: finalVx,
          vy: finalVy,
          age: newAge,
          opacity: newOpacity
        }
      })
      .filter((p): p is FlowParticle => p !== null)
  }, [flowState, streams, width, height])

  // Generate field forces based on generative rules
  useEffect(() => {
    const generateFieldForces = () => {
      const numFields = 3 + Math.floor(Math.random() * 3) // 3-5 fields
      const newFields = Array.from({ length: numFields }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        strength: (Math.random() - 0.5) * stateConfig.motionIntensity,
        radius: 50 + Math.random() * 100
      }))

      setFlowState(prev => ({
        ...prev,
        fieldForces: newFields
      }))
    }

    const interval = setInterval(generateFieldForces, ambient.timing(10000, 0.3))
    generateFieldForces() // Initial generation
    return () => clearInterval(interval)
  }, [stateConfig, width, height])

  // Breathing cycle
  useEffect(() => {
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
        setFlowState(prev => ({
          ...prev,
          breathing: phases[currentPhaseIndex].phase as FlowState['breathing']
        }))
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length
        setTimeout(nextPhase, phases[currentPhaseIndex].duration)
      }
      nextPhase()
    }

    breathingCycle()
  }, [])

  // Main animation loop
  useEffect(() => {
    let lastTime = Date.now()
    
    const animate = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      setFlowState(prev => {
        // Generate new particles
        const newParticles: FlowParticle[] = []
        streams.forEach(stream => {
          const shouldSpawn = Math.random() < stream.velocity * 0.01 // Spawn probability
          if (shouldSpawn && prev.particles.length < maxParticles) {
            const particle = generateParticle(stream)
            if (particle) newParticles.push(particle)
          }
        })

        // Update existing particles
        const updatedParticles = updateParticles([...prev.particles, ...newParticles], deltaTime)

        // Update generative phase
        const newPhase = (prev.generativePhase + deltaTime * 0.0001) % 1

        return {
          ...prev,
          particles: updatedParticles,
          generativePhase: newPhase
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [streams, generateParticle, updateParticles, maxParticles])

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = ds.colors.semantic.background
    ctx.fillRect(0, 0, width, height)

    // Draw field forces (debug mode)
    if (ambientState === 'focused') {
      flowState.fieldForces.forEach(field => {
        ctx.beginPath()
        ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(220, 50%, 50%, ${Math.abs(field.strength) * 0.1})`
        ctx.fill()
      })
    }

    // Draw particles
    flowState.particles.forEach(particle => {
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      
      // Color influenced by generative phase
      const phaseHue = (flowState.generativePhase * 60) % 360
      const baseColor = particle.color.match(/\d+/g)
      if (baseColor) {
        const [h, s, l] = baseColor.map(Number)
        ctx.fillStyle = `hsla(${(h + phaseHue) % 360}, ${s}%, ${l}%, ${particle.opacity})`
      } else {
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.opacity
      }
      
      ctx.fill()
      ctx.globalAlpha = 1
    })

    // Draw stream labels
    if (showLabels) {
      ctx.font = `${ds.typography.scale.xs} ${ds.typography.accent}`
      ctx.fillStyle = ds.colors.neutral[400]
      
      streams.forEach((stream, index) => {
        const y = 20 + index * 16
        ctx.fillText(
          `${stream.name}: ${stream.values[stream.values.length - 1]?.toFixed(2) || 'N/A'}`,
          10, y
        )
        
        // Significance indicator
        ctx.fillStyle = stream.color || ambient.generateColor(index, 'neutral')
        ctx.fillRect(width - 60, y - 8, stream.significance * 40, 4)
        ctx.fillStyle = ds.colors.neutral[400]
      })
    }

  }, [flowState, streams, width, height, ambientState, showLabels])

  // Handle mouse interaction
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!interactive) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setFlowState(prev => ({
      ...prev,
      focus: {
        ...prev.focus,
        x,
        y,
        strength: 0.3 // Stronger when interacting
      }
    }))
  }, [interactive])

  const handleMouseLeave = useCallback(() => {
    setFlowState(prev => ({
      ...prev,
      focus: {
        ...prev.focus,
        x: width / 2,
        y: height / 2,
        strength: 0.1 // Weaker when not interacting
      }
    }))
  }, [width, height])

  return (
    <div className={`ambient-data-flow ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: ambientAnimations }} />
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: 'auto',
          border: `1px solid ${ds.colors.semantic.border}`,
          borderRadius: ds.radius.md,
          backgroundColor: ds.colors.semantic.background,
          cursor: interactive ? 'crosshair' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Stream control panel */}
      <div style={{
        marginTop: ds.spacing.sm,
        fontSize: ds.typography.scale.xs,
        color: ds.colors.neutral[400],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          {flowState.particles.length} particles • 
          {flowState.fieldForces.length} fields • 
          Phase: {(flowState.generativePhase * 100).toFixed(0)}%
        </span>
        <span>State: {ambientState}</span>
      </div>
    </div>
  )
}

export default AmbientDataFlow