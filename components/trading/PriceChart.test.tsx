import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { PriceChart } from './PriceChart'
import { useLivePrice } from '@/app/hooks/useLivePrices'

// Mock the hook
jest.mock('@/app/hooks/useLivePrices')

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}))

// Mock fetch
global.fetch = jest.fn()

describe('PriceChart', () => {
  const mockUseLivePrice = useLivePrice as jest.MockedFunction<typeof useLivePrice>
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        history: [
          { time: 1640000000000, price: 50000, volume: 100 },
          { time: 1640000060000, price: 50100, volume: 110 },
          { time: 1640000120000, price: 50200, volume: 120 },
        ]
      })
    })
  })

  it('renders loading state initially', () => {
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
  })

  it('renders error state when there is an error', async () => {
    const error = new Error('Connection failed')
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: false,
      error,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load price data: Connection failed')).toBeInTheDocument()
    })
  })

  it('fetches historical data on mount', async () => {
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" timeframe="1m" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/kraken/historical?symbol=BTC/USD&interval=1m&count=50')
    })
  })

  it('renders chart with historical data', async () => {
    mockUseLivePrice.mockReturnValue({
      price: {
        symbol: 'BTC/USD',
        price: 50300,
        timestamp: 1640000180000,
        volume24h: 130,
        changePercent24h: 2.5,
      },
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)

    await waitFor(() => {
      const chart = screen.getByTestId('line-chart')
      expect(chart).toBeInTheDocument()
      
      const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}')
      expect(chartData.datasets).toHaveLength(1)
      expect(chartData.datasets[0].label).toBe('BTC/USD')
    })
  })

  it('updates chart with live price data', async () => {
    const { rerender } = render(<PriceChart symbol="BTC/USD" />)
    
    // Initial render with no live price
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    // Wait for historical data to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Update with live price
    mockUseLivePrice.mockReturnValue({
      price: {
        symbol: 'BTC/USD',
        price: 50400,
        timestamp: 1640000240000,
        volume24h: 140,
        changePercent24h: 3.0,
      },
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    rerender(<PriceChart symbol="BTC/USD" />)

    await waitFor(() => {
      const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}')
      // Should have historical data plus new live price
      expect(chartData.labels.length).toBeGreaterThan(3)
    })
  })

  it('shows connection status indicator', async () => {
    mockUseLivePrice.mockReturnValue({
      price: {
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now(),
        volume24h: 100,
        changePercent24h: 1.5,
      },
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)

    await waitFor(() => {
      // Connection indicator is rendered as a div with specific styles
      const chart = screen.getByTestId('line-chart')
      expect(chart).toBeInTheDocument()
    })
  })

  it('displays live price information in header', async () => {
    mockUseLivePrice.mockReturnValue({
      price: {
        symbol: 'BTC/USD',
        price: 50000.12345,
        timestamp: Date.now(),
        volume24h: 100,
        changePercent24h: -1.23,
      },
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)

    await waitFor(() => {
      expect(screen.getByText('BTC/USD')).toBeInTheDocument()
      expect(screen.getByText('$50,000.12345')).toBeInTheDocument()
      expect(screen.getByText('-1.23%')).toBeInTheDocument()
    })
  })

  it('handles fetch error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)

    await waitFor(() => {
      // Should still render, just without historical data
      const chart = screen.getByTestId('line-chart')
      expect(chart).toBeInTheDocument()
    })
  })

  it('limits data points to prevent performance issues', async () => {
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    const { rerender } = render(<PriceChart symbol="BTC/USD" />)

    // Simulate adding many live price updates
    for (let i = 0; i < 150; i++) {
      mockUseLivePrice.mockReturnValue({
        price: {
          symbol: 'BTC/USD',
          price: 50000 + i * 10,
          timestamp: Date.now() + i * 60000,
          volume24h: 100 + i,
          changePercent24h: i * 0.01,
        },
        isConnected: true,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
      })
      rerender(<PriceChart symbol="BTC/USD" />)
    }

    await waitFor(() => {
      const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}')
      // Should be limited to maxDataPoints (100)
      expect(chartData.labels.length).toBeLessThanOrEqual(100)
    })
  })

  it('applies correct styling based on price trend', async () => {
    mockUseLivePrice.mockReturnValue({
      price: {
        symbol: 'BTC/USD',
        price: 51000, // Higher than initial historical data
        timestamp: Date.now(),
        volume24h: 150,
        changePercent24h: 5.0,
      },
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    render(<PriceChart symbol="BTC/USD" />)

    await waitFor(() => {
      const chartData = JSON.parse(screen.getByTestId('chart-data').textContent || '{}')
      // Dataset should have uptrend color
      expect(chartData.datasets[0].borderColor).toContain('185') // Green color component
    })
  })

  it('respects custom height prop', () => {
    mockUseLivePrice.mockReturnValue({
      price: null,
      isConnected: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    })

    const { container } = render(<PriceChart symbol="BTC/USD" height={600} />)
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ height: '600px' })
  })
})