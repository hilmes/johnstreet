import {
  formatPrice,
  formatPriceCurrency,
  formatSize,
  formatVolume,
  formatPercentage,
  formatCryptoAmount
} from './formatters'

describe('formatters', () => {
  describe('formatPrice', () => {
    it('formats prices based on magnitude', () => {
      expect(formatPrice(50000)).toBe('50000')
      expect(formatPrice(10001)).toBe('10001')
      expect(formatPrice(10000)).toBe('10000.00')
      expect(formatPrice(500)).toBe('500.00')
      expect(formatPrice(100)).toBe('100.00')
      expect(formatPrice(50.123456)).toBe('50.1235')
      expect(formatPrice(1.123456)).toBe('1.1235')
      expect(formatPrice(0.123456)).toBe('0.123456')
      expect(formatPrice(0.00123456)).toBe('0.001235')
    })

    it('handles string inputs', () => {
      expect(formatPrice('50000')).toBe('50000')
      expect(formatPrice('100.5')).toBe('100.50')
      expect(formatPrice('0.123456')).toBe('0.123456')
    })

    it('handles invalid inputs', () => {
      expect(formatPrice(NaN)).toBe('0.00')
      expect(formatPrice('invalid')).toBe('0.00')
      expect(formatPrice('')).toBe('0.00')
    })

    it('handles edge cases', () => {
      expect(formatPrice(0)).toBe('0.000000')
      expect(formatPrice(-100)).toBe('-100.00')
      expect(formatPrice(Infinity)).toBe('∞')
      expect(formatPrice(-Infinity)).toBe('-∞')
    })
  })

  describe('formatPriceCurrency', () => {
    it('formats USD prices correctly', () => {
      expect(formatPriceCurrency(100)).toBe('$100.00')
      expect(formatPriceCurrency(1234.56)).toBe('$1,234.56')
      expect(formatPriceCurrency(0.123456)).toBe('$0.123456')
      expect(formatPriceCurrency(0.5)).toBe('$0.50')
    })

    it('formats other currencies', () => {
      expect(formatPriceCurrency(100, 'EUR')).toBe('€100.00')
      expect(formatPriceCurrency(100, 'GBP')).toBe('£100.00')
      expect(formatPriceCurrency(100, 'JPY')).toBe('¥100')
    })

    it('handles small values with more decimals', () => {
      expect(formatPriceCurrency(0.000123)).toBe('$0.000123')
      expect(formatPriceCurrency(0.999999)).toBe('$0.999999')
    })

    it('handles large values with less decimals', () => {
      expect(formatPriceCurrency(1000000)).toBe('$1,000,000.00')
      expect(formatPriceCurrency(50.123456)).toBe('$50.12')
    })
  })

  describe('formatSize', () => {
    it('formats sizes with appropriate units', () => {
      expect(formatSize(5000)).toBe('5.00K')
      expect(formatSize(1500)).toBe('1.50K')
      expect(formatSize(1000)).toBe('1.00K')
      expect(formatSize(999)).toBe('999')
      expect(formatSize(100)).toBe('100')
      expect(formatSize(50.1234)).toBe('50.12')
      expect(formatSize(10.1234)).toBe('10.12')
      expect(formatSize(5.123456)).toBe('5.1235')
    })

    it('handles string inputs', () => {
      expect(formatSize('5000')).toBe('5.00K')
      expect(formatSize('100')).toBe('100')
      expect(formatSize('5.1234')).toBe('5.1234')
    })

    it('handles invalid inputs', () => {
      expect(formatSize(NaN)).toBe('0')
      expect(formatSize('invalid')).toBe('0')
    })

    it('handles edge cases', () => {
      expect(formatSize(0)).toBe('0.0000')
      expect(formatSize(-1000)).toBe('-1.00K')
    })
  })

  describe('formatVolume', () => {
    it('formats volumes with appropriate units', () => {
      expect(formatVolume(2500000000)).toBe('2.50B')
      expect(formatVolume(1000000000)).toBe('1.00B')
      expect(formatVolume(500000000)).toBe('500.00M')
      expect(formatVolume(5000000)).toBe('5.00M')
      expect(formatVolume(1000000)).toBe('1.00M')
      expect(formatVolume(500000)).toBe('500.00K')
      expect(formatVolume(5000)).toBe('5.00K')
      expect(formatVolume(1000)).toBe('1.00K')
      expect(formatVolume(500)).toBe('500.00')
    })

    it('handles edge cases', () => {
      expect(formatVolume(0)).toBe('0.00')
      expect(formatVolume(999)).toBe('999.00')
      expect(formatVolume(999999)).toBe('1000.00K')
      expect(formatVolume(999999999)).toBe('1000.00M')
    })

    it('handles negative values', () => {
      expect(formatVolume(-1000000)).toBe('-1.00M')
      expect(formatVolume(-5000)).toBe('-5.00K')
    })
  })

  describe('formatPercentage', () => {
    it('formats percentages with default decimals', () => {
      expect(formatPercentage(10)).toBe('10.00%')
      expect(formatPercentage(5.5)).toBe('5.50%')
      expect(formatPercentage(0.12)).toBe('0.12%')
      expect(formatPercentage(-2.5)).toBe('-2.50%')
    })

    it('formats percentages with custom decimals', () => {
      expect(formatPercentage(10.12345, 0)).toBe('10%')
      expect(formatPercentage(10.12345, 1)).toBe('10.1%')
      expect(formatPercentage(10.12345, 3)).toBe('10.123%')
      expect(formatPercentage(10.12345, 4)).toBe('10.1235%')
    })

    it('handles edge cases', () => {
      expect(formatPercentage(0)).toBe('0.00%')
      expect(formatPercentage(100)).toBe('100.00%')
      expect(formatPercentage(-100)).toBe('-100.00%')
    })
  })

  describe('formatCryptoAmount', () => {
    it('formats BTC with 8 decimals', () => {
      expect(formatCryptoAmount(1, 'BTC')).toBe('1.00000000')
      expect(formatCryptoAmount(0.12345678, 'BTC')).toBe('0.12345678')
      expect(formatCryptoAmount(0.123456789, 'BTC')).toBe('0.12345679')
    })

    it('formats ETH with 6 decimals', () => {
      expect(formatCryptoAmount(1, 'ETH')).toBe('1.000000')
      expect(formatCryptoAmount(0.123456, 'ETH')).toBe('0.123456')
      expect(formatCryptoAmount(0.1234567, 'ETH')).toBe('0.123457')
    })

    it('formats other cryptos with 2 decimals', () => {
      expect(formatCryptoAmount(100, 'ADA')).toBe('100.00')
      expect(formatCryptoAmount(50.123, 'DOT')).toBe('50.12')
      expect(formatCryptoAmount(25.678, 'LINK')).toBe('25.68')
    })

    it('handles edge cases', () => {
      expect(formatCryptoAmount(0, 'BTC')).toBe('0.00000000')
      expect(formatCryptoAmount(0, 'ETH')).toBe('0.000000')
      expect(formatCryptoAmount(0, 'ADA')).toBe('0.00')
    })

    it('handles very small amounts', () => {
      expect(formatCryptoAmount(0.00000001, 'BTC')).toBe('0.00000001')
      expect(formatCryptoAmount(0.000001, 'ETH')).toBe('0.000001')
    })

    it('handles negative amounts', () => {
      expect(formatCryptoAmount(-1, 'BTC')).toBe('-1.00000000')
      expect(formatCryptoAmount(-0.5, 'ETH')).toBe('-0.500000')
    })
  })
})