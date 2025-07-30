/**
 * Shared Component Types
 * TypeScript-first approach with strict typing as per AI-GUIDELINES.md
 */

import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

// Base component props
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  'data-testid'?: string
}

// Size variants
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Color variants
export type ColorVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'neutral'

// Component variants
export type Variant = 'solid' | 'outline' | 'ghost' | 'link'

// Loading states
export interface LoadingProps {
  loading?: boolean
  loadingText?: string
}

// Accessibility props
export interface AccessibilityProps {
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  role?: string
}

// Button component props
export interface ButtonProps extends 
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
  BaseComponentProps,
  LoadingProps,
  AccessibilityProps {
  variant?: Variant
  size?: Size
  color?: ColorVariant
  fullWidth?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
}

// Input component props
export interface InputProps extends 
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
  BaseComponentProps,
  AccessibilityProps {
  size?: Size
  variant?: 'outline' | 'filled' | 'underline'
  error?: boolean
  helperText?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
}

// Card component props
export interface CardProps extends 
  HTMLAttributes<HTMLDivElement>,
  BaseComponentProps {
  variant?: 'elevated' | 'outlined' | 'filled'
  padding?: Size
  hover?: boolean
}

// Modal component props
export interface ModalProps extends BaseComponentProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: Size
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

// Data table props
export interface DataTableColumn<T = any> {
  key: keyof T
  header: string
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: T[keyof T], row: T, index: number) => ReactNode
}

export interface DataTableProps<T = any> extends BaseComponentProps {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  emptyMessage?: string
  sortBy?: keyof T
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void
  onRowClick?: (row: T, index: number) => void
}

// Metric card props
export interface MetricCardProps extends BaseComponentProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'percentage' | 'absolute'
  trend?: 'up' | 'down' | 'neutral'
  description?: string
  loading?: boolean
}

// Alert props
export interface AlertProps extends BaseComponentProps {
  variant?: ColorVariant
  title?: string
  onClose?: () => void
  closable?: boolean
}

// Form field props
export interface FormFieldProps extends BaseComponentProps {
  label?: string
  required?: boolean
  error?: string
  helperText?: string
  layout?: 'vertical' | 'horizontal'
}

// Trading-specific types
export interface PriceDisplayProps extends BaseComponentProps {
  price: number
  currency?: string
  precision?: number
  size?: Size
}

export interface PercentageChangeProps extends BaseComponentProps {
  value: number
  precision?: number
  showSign?: boolean
  size?: Size
}

export interface TradingSymbolProps extends BaseComponentProps {
  symbol: string
  showIcon?: boolean
  size?: Size
}

export interface OrderStatusProps extends BaseComponentProps {
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'expired'
  size?: Size
}