/**
 * Accessibility Provider
 * 
 * WCAG 2.1 AA compliance provider following AI-GUIDELINES.md standards:
 * - Keyboard navigation support
 * - Screen reader optimization
 * - Focus management
 * - Color contrast enforcement
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'normal' | 'large' | 'extra-large'
  keyboardNavigation: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  announceToScreenReader: (message: string) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reducedMotion: false,
    highContrast: false,
    fontSize: 'normal',
    keyboardNavigation: false
  })

  const [announcements, setAnnouncements] = useState<string[]>([])

  useEffect(() => {
    // Detect user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    
    setSettings(prev => ({
      ...prev,
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast
    }))

    // Listen for keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setSettings(prev => ({ ...prev, keyboardNavigation: true }))
      }
    }

    const handleMouseDown = () => {
      setSettings(prev => ({ ...prev, keyboardNavigation: false }))
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  useEffect(() => {
    // Apply settings to document
    const root = document.documentElement
    
    root.classList.toggle('reduced-motion', settings.reducedMotion)
    root.classList.toggle('high-contrast', settings.highContrast)
    root.classList.toggle('keyboard-navigation', settings.keyboardNavigation)
    
    root.setAttribute('data-font-size', settings.fontSize)
  }, [settings])

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const announceToScreenReader = (message: string) => {
    setAnnouncements(prev => [...prev, message])
    
    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 1000)
  }

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        announceToScreenReader
      }}
    >
      {children}
      
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <span key={index}>{announcement}</span>
        ))}
      </div>
      
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 bg-blue-600 text-white px-4 py-2 rounded-br-lg"
      >
        Skip to main content
      </a>
    </AccessibilityContext.Provider>
  )
}