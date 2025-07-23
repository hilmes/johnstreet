import React from 'react'
import { Card as MuiCard, CardContent as MuiCardContent } from '@mui/material'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
}

export function Card({ children, className = '', hover = true, gradient = false }: CardProps) {
  const baseClasses = 'transition-all duration-300'
  const hoverClasses = hover ? 'hover:shadow-xl hover:translate-y-[-2px]' : ''
  const gradientClasses = gradient ? 'bg-gradient-to-br from-gray-900 to-gray-800' : ''
  
  return (
    <MuiCard className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}>
      {children}
    </MuiCard>
  )
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <MuiCardContent className={`p-6 ${className}`}>
      {children}
    </MuiCardContent>
  )
}