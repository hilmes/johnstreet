/**
 * Accessibility Enhancement Component
 * 
 * Provides enhanced accessibility features for trading interfaces
 * including keyboard navigation, screen reader support, and focus management
 */

import React, { useEffect, useState, useRef } from 'react'
import { ds } from '@/lib/design/TufteDesignSystem'

interface AccessibilityEnhancerProps {
  children: React.ReactNode
  announcements?: string[]
  focusTrap?: boolean
  skipToContent?: boolean
}

// Live region for dynamic announcements
export const LiveRegion: React.FC<{
  message: string
  priority?: 'polite' | 'assertive'
  clear?: boolean
}> = ({ message, priority = 'polite', clear = false }) => {
  const [currentMessage, setCurrentMessage] = useState('')

  useEffect(() => {
    if (clear) {
      setCurrentMessage('')
      return
    }
    
    if (message) {
      // Clear first, then set message to ensure screen reader picks it up
      setCurrentMessage('')
      setTimeout(() => setCurrentMessage(message), 100)
    }
  }, [message, clear])

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
    >
      {currentMessage}
    </div>
  )
}

// Enhanced Focus Indicator
export const FocusRing: React.FC<{
  children: React.ReactNode
  offset?: number
  color?: string
}> = ({ children, offset = 2, color = ds.colors.semantic.active }) => {
  return (
    <div
      style={{
        position: 'relative',
        '&:focus-within': {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: `-${offset}px`,
            left: `-${offset}px`,
            right: `-${offset}px`,
            bottom: `-${offset}px`,
            border: `2px solid ${color}`,
            borderRadius: ds.radius.md,
            pointerEvents: 'none'
          }
        }
      }}
    >
      {children}
    </div>
  )
}

// Skip to Content Link
export const SkipToContent: React.FC<{
  targetId: string
  label?: string
}> = ({ targetId, label = 'Skip to main content' }) => {
  const handleSkip = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const target = document.getElementById(targetId)
      if (target) {
        target.focus()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <a
      href={`#${targetId}`}
      onKeyDown={handleSkip}
      style={{
        position: 'absolute',
        top: '-40px',
        left: ds.spacing.md,
        background: ds.colors.semantic.background,
        color: ds.colors.neutral[900],
        padding: `${ds.spacing.sm} ${ds.spacing.md}`,
        textDecoration: 'none',
        borderRadius: ds.radius.sm,
        border: `2px solid ${ds.colors.semantic.active}`,
        fontSize: ds.typography.scale.sm,
        fontWeight: ds.typography.weights.medium,
        zIndex: 1000,
        transition: 'all 200ms ease',
        ':focus': {
          top: ds.spacing.md
        }
      }}
    >
      {label}
    </a>
  )
}

// Keyboard Navigation Helper
export const KeyboardNavigation: React.FC<{
  children: React.ReactNode
  onEscape?: () => void
  onEnter?: () => void
  trapFocus?: boolean
}> = ({ children, onEscape, onEnter, trapFocus = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([])

  useEffect(() => {
    if (!trapFocus || !containerRef.current) return

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]

    setFocusableElements(elements)

    // Focus first element
    if (elements.length > 0) {
      elements[0].focus()
    }
  }, [trapFocus])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onEscape) {
      onEscape()
      return
    }

    if (e.key === 'Enter' && onEnter) {
      onEnter()
      return
    }

    if (trapFocus && e.key === 'Tab') {
      if (focusableElements.length === 0) return

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
      
      if (e.shiftKey) {
        // Shift + Tab (backward)
        const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
        e.preventDefault()
        focusableElements[previousIndex].focus()
      } else {
        // Tab (forward)
        const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1
        e.preventDefault()
        focusableElements[nextIndex].focus()
      }
    }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}

// High Contrast Mode Support
export const HighContrastSupport: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    mediaQuery.addEventListener('change', handler)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  if (highContrast) {
    return (
      <div
        style={{
          '--color-background': '#000000',
          '--color-text': '#ffffff',
          '--color-border': '#ffffff',
          '--color-focus': '#ffff00',
          '--color-profit': '#00ff00',
          '--color-loss': '#ff0000',
          filter: 'contrast(1.5)'
        }}
      >
        {children}
      </div>
    )
  }

  return <>{children}</>
}

// Price Change Announcer for Screen Readers
export const PriceChangeAnnouncer: React.FC<{
  symbol: string
  oldPrice?: number
  newPrice: number
  change?: number
}> = ({ symbol, oldPrice, newPrice, change }) => {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (oldPrice && oldPrice !== newPrice) {
      const direction = newPrice > oldPrice ? 'increased' : 'decreased'
      const changeText = change ? ` by ${Math.abs(change).toFixed(2)}%` : ''
      
      setAnnouncement(
        `${symbol} price ${direction} to $${newPrice.toFixed(2)}${changeText}`
      )
    }
  }, [symbol, oldPrice, newPrice, change])

  return <LiveRegion message={announcement} priority="polite" />
}

// Main Accessibility Enhancer
export const AccessibilityEnhancer: React.FC<AccessibilityEnhancerProps> = ({
  children,
  announcements = [],
  focusTrap = false,
  skipToContent = false
}) => {
  const [currentAnnouncement, setCurrentAnnouncement] = useState('')

  useEffect(() => {
    if (announcements.length > 0) {
      const latest = announcements[announcements.length - 1]
      setCurrentAnnouncement(latest)
    }
  }, [announcements])

  return (
    <HighContrastSupport>
      <KeyboardNavigation trapFocus={focusTrap}>
        {skipToContent && <SkipToContent targetId="main-content" />}
        <LiveRegion message={currentAnnouncement} />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </KeyboardNavigation>
    </HighContrastSupport>
  )
}

export default AccessibilityEnhancer