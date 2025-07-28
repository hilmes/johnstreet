/**
 * Utility functions for formatting prices, sizes, and other numeric values
 */

export const formatPrice = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) return '0.00'
  
  if (num > 10000) return num.toFixed(0)
  if (num > 100) return num.toFixed(2)
  if (num > 1) return num.toFixed(4)
  return num.toFixed(6)
}

export const formatPriceCurrency = (value: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value)
}

export const formatSize = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) return '0'
  
  if (num > 1000) return `${(num / 1000).toFixed(2)}K`
  if (num > 100) return num.toFixed(0)
  if (num > 10) return num.toFixed(2)
  return num.toFixed(4)
}

export const formatVolume = (value: number): string => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toFixed(2)
}

export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`
}

export const formatCryptoAmount = (value: number, currency: string): string => {
  const decimals = currency === 'BTC' ? 8 : currency === 'ETH' ? 6 : 2
  return value.toFixed(decimals)
}