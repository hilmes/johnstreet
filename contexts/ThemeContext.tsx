'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type ThemeName = 'cryptowatch' | 'cyberpunk' | 'financial-excellence' | 'financial-excellence-dark'

export interface Theme {
  name: ThemeName
  displayName: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    success: string
    warning: string
    error: string
    border: string
  }
  fonts: {
    primary: string
    secondary: string
  }
  effects: {
    glow: boolean
    scanlines: boolean
    pixelated: boolean
  }
}

export const themes: Record<ThemeName, Theme> = {
  cryptowatch: {
    name: 'cryptowatch',
    displayName: 'CryptoWatch',
    colors: {
      primary: '#2962ff',
      secondary: '#1976d2',
      accent: '#00bcd4',
      background: '#131722',
      surface: '#1e222d',
      text: '#d1d4dc',
      textSecondary: '#787b86',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      border: '#2a2e39'
    },
    fonts: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      secondary: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    },
    effects: {
      glow: false,
      scanlines: false,
      pixelated: false
    }
  },
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    colors: {
      primary: '#00f5ff',
      secondary: '#533a71',
      accent: '#ff0040',
      background: '#0f0f23',
      surface: '#1a1a2e',
      text: '#00ff41',
      textSecondary: '#8b949e',
      success: '#00ff41',
      warning: '#ffff00',
      error: '#ff0040',
      border: '#00f5ff'
    },
    fonts: {
      primary: "'Press Start 2P', monospace",
      secondary: "'Press Start 2P', monospace"
    },
    effects: {
      glow: true,
      scanlines: true,
      pixelated: true
    }
  },
  'financial-excellence': {
    name: 'financial-excellence',
    displayName: 'Financial Excellence',
    colors: {
      primary: '#2e3b5f',
      secondary: '#5a6b8c',
      accent: '#3b82f6',
      background: '#fafafa',
      surface: '#ffffff',
      text: '#09090b',
      textSecondary: '#71717a',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      border: '#e4e4e7'
    },
    fonts: {
      primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      secondary: '"IBM Plex Mono", "SF Mono", Monaco, Consolas, monospace'
    },
    effects: {
      glow: false,
      scanlines: false,
      pixelated: false
    }
  },
  'financial-excellence-dark': {
    name: 'financial-excellence-dark',
    displayName: 'Financial Excellence Dark',
    colors: {
      primary: '#5b7dd8',
      secondary: '#8ca3e5',
      accent: '#60a5fa',
      background: '#000000',
      surface: '#0a0a0a',
      text: '#f4f4f5',
      textSecondary: '#a1a1aa',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      border: '#27272a'
    },
    fonts: {
      primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      secondary: '"IBM Plex Mono", "SF Mono", Monaco, Consolas, monospace'
    },
    effects: {
      glow: false,
      scanlines: false,
      pixelated: false
    }
  }
}

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (themeName: ThemeName) => void
  availableThemes: Theme[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>('cryptowatch')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('johnstreet-theme') as ThemeName
    if (savedTheme && themes[savedTheme]) {
      setCurrentThemeName(savedTheme)
    }
  }, [])

  useEffect(() => {
    // Apply theme CSS variables
    const theme = themes[currentThemeName]
    const root = document.documentElement
    
    // Set CSS variables
    root.style.setProperty('--theme-primary', theme.colors.primary)
    root.style.setProperty('--theme-secondary', theme.colors.secondary)
    root.style.setProperty('--theme-accent', theme.colors.accent)
    root.style.setProperty('--theme-background', theme.colors.background)
    root.style.setProperty('--theme-surface', theme.colors.surface)
    root.style.setProperty('--theme-text', theme.colors.text)
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--theme-success', theme.colors.success)
    root.style.setProperty('--theme-warning', theme.colors.warning)
    root.style.setProperty('--theme-error', theme.colors.error)
    root.style.setProperty('--theme-border', theme.colors.border)
    root.style.setProperty('--theme-font-primary', theme.fonts.primary)
    root.style.setProperty('--theme-font-secondary', theme.fonts.secondary)

    // Apply theme class to body
    document.body.className = document.body.className.replace(/theme-\w+/g, '')
    document.body.classList.add(`theme-${currentThemeName}`)

    // Save to localStorage
    localStorage.setItem('johnstreet-theme', currentThemeName)
  }, [currentThemeName])

  const setTheme = (themeName: ThemeName) => {
    setCurrentThemeName(themeName)
  }

  const value = {
    currentTheme: themes[currentThemeName],
    setTheme,
    availableThemes: Object.values(themes)
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}