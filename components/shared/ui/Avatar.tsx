'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string
  alt?: string
  initials?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }
  
  return (
    <div className={cn(
      'inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-medium',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </div>
  )
}