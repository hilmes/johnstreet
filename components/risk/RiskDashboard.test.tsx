import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RiskDashboard } from './RiskDashboard'

// Mock API Service
jest.mock('@/services/ApiService', () => ({
  ApiService: jest.fn().mockImplementation(() => ({
    getRiskMetrics: jest.fn().mockResolvedValue({
      portfolioValue: 100000,
      totalExposure: 80000,
      leverage: 1.5,
      marginUsed: 15000,
      availableMargin: 35000,
      valueAtRisk: {
        daily95: 2500,
        daily99: 3500,
        weekly95: 5500
      },
      drawdown: {
        current: 5.2,
        maximum: 12.5,
        duration: 15
      },
      sharpeRatio: 1.35,
      sortinoRatio: 1.82,
      beta: 0.95,
      correlation: {
        market: 0.78,
        btc: 0.85
      },
      positionSizes: [
        { symbol: 'BTC/USD', exposure: 40000, percentage: 50, risk: 'medium' },
        { symbol: 'ETH/USD', exposure: 20000, percentage: 25, risk: 'low' },
        { symbol: 'SOL/USD', exposure: 20000, percentage: 25, risk: 'high' }
      ],
      riskLimits: {
        maxLeverage: 3,
        maxDrawdown: 20,
        maxPositionSize: 50,
        dailyLossLimit: 5000
      },
      volatilityMetrics: {
        portfolioVol: 18.5,
        realizedVol: 16.2,
        impliedVol: 22.1,
        volHistory: [15, 16, 18, 17, 19, 18.5]
      }
    })
  }))
}))

describe('RiskDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render risk dashboard with all sections', async () => {
    render(<RiskDashboard />)

    // Wait for data to load
    await screen.findByText('Risk Management Dashboard')

    // Check main sections
    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    expect(screen.getByText('Risk Metrics')).toBeInTheDocument()
    expect(screen.getByText('Position Sizing')).toBeInTheDocument()
    expect(screen.getByText('Risk Limits')).toBeInTheDocument()
    expect(screen.getByText('Volatility Analysis')).toBeInTheDocument()
  })

  it('should display portfolio overview metrics', async () => {
    render(<RiskDashboard />)

    // Wait for data to load
    await screen.findByText(/Portfolio Value/)

    expect(screen.getByText(/\$100,000/)).toBeInTheDocument()
    expect(screen.getByText(/Total Exposure/)).toBeInTheDocument()
    expect(screen.getByText(/\$80,000/)).toBeInTheDocument()
    expect(screen.getByText(/Leverage/)).toBeInTheDocument()
    expect(screen.getByText(/1.5x/)).toBeInTheDocument()
  })

  it('should display value at risk metrics', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Daily VaR \(95%\)/)

    expect(screen.getByText(/\$2,500/)).toBeInTheDocument()
    expect(screen.getByText(/Daily VaR \(99%\)/)).toBeInTheDocument()
    expect(screen.getByText(/\$3,500/)).toBeInTheDocument()
    expect(screen.getByText(/Weekly VaR \(95%\)/)).toBeInTheDocument()
    expect(screen.getByText(/\$5,500/)).toBeInTheDocument()
  })

  it('should display drawdown information', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Current Drawdown/)

    expect(screen.getByText(/5.2%/)).toBeInTheDocument()
    expect(screen.getByText(/Maximum Drawdown/)).toBeInTheDocument()
    expect(screen.getByText(/12.5%/)).toBeInTheDocument()
    expect(screen.getByText(/Drawdown Duration/)).toBeInTheDocument()
    expect(screen.getByText(/15 days/)).toBeInTheDocument()
  })

  it('should display risk ratios', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Sharpe Ratio/)

    expect(screen.getByText(/1.35/)).toBeInTheDocument()
    expect(screen.getByText(/Sortino Ratio/)).toBeInTheDocument()
    expect(screen.getByText(/1.82/)).toBeInTheDocument()
    expect(screen.getByText(/Beta/)).toBeInTheDocument()
    expect(screen.getByText(/0.95/)).toBeInTheDocument()
  })

  it('should display position sizes with risk levels', async () => {
    render(<RiskDashboard />)

    await screen.findByText('BTC/USD')

    // Check positions
    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
    expect(screen.getByText(/\$40,000/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
    expect(screen.getByText('Medium Risk')).toBeInTheDocument()

    expect(screen.getByText('ETH/USD')).toBeInTheDocument()
    expect(screen.getByText(/\$20,000/)).toBeInTheDocument()
    expect(screen.getByText(/25%/)).toBeInTheDocument()
    expect(screen.getByText('Low Risk')).toBeInTheDocument()

    expect(screen.getByText('SOL/USD')).toBeInTheDocument()
    expect(screen.getByText('High Risk')).toBeInTheDocument()
  })

  it('should display risk gauges with correct colors', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Leverage/)

    // Leverage gauge should be green (1.5 < 2 warning threshold)
    const leverageGauge = screen.getByTestId('leverage-gauge')
    expect(leverageGauge).toHaveStyle({ backgroundColor: expect.stringContaining('rgb') })

    // Check if gauge shows correct percentage
    const leverageBar = leverageGauge.querySelector('[data-testid="gauge-bar"]')
    expect(leverageBar).toHaveStyle({ width: '50%' }) // 1.5/3 = 50%
  })

  it('should display risk limits', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Risk Limits/)

    expect(screen.getByText(/Max Leverage/)).toBeInTheDocument()
    expect(screen.getByText(/3.0x/)).toBeInTheDocument()
    expect(screen.getByText(/Max Drawdown/)).toBeInTheDocument()
    expect(screen.getByText(/20%/)).toBeInTheDocument()
    expect(screen.getByText(/Max Position Size/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
    expect(screen.getByText(/Daily Loss Limit/)).toBeInTheDocument()
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument()
  })

  it('should display volatility metrics', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Portfolio Volatility/)

    expect(screen.getByText(/18.5%/)).toBeInTheDocument()
    expect(screen.getByText(/Realized Volatility/)).toBeInTheDocument()
    expect(screen.getByText(/16.2%/)).toBeInTheDocument()
    expect(screen.getByText(/Implied Volatility/)).toBeInTheDocument()
    expect(screen.getByText(/22.1%/)).toBeInTheDocument()
  })

  it('should show warning colors for high risk values', async () => {
    // Mock high risk values
    const { ApiService } = require('@/services/ApiService')
    ApiService.mockImplementation(() => ({
      getRiskMetrics: jest.fn().mockResolvedValue({
        portfolioValue: 100000,
        totalExposure: 100000,
        leverage: 2.8, // Near max
        marginUsed: 45000, // High margin usage
        availableMargin: 5000,
        valueAtRisk: {
          daily95: 4500, // Near daily loss limit
          daily99: 5500,
          weekly95: 8000
        },
        drawdown: {
          current: 18, // Near max drawdown
          maximum: 19,
          duration: 30
        },
        sharpeRatio: 0.5,
        sortinoRatio: 0.8,
        beta: 1.5,
        correlation: {
          market: 0.95,
          btc: 0.98
        },
        positionSizes: [],
        riskLimits: {
          maxLeverage: 3,
          maxDrawdown: 20,
          maxPositionSize: 50,
          dailyLossLimit: 5000
        },
        volatilityMetrics: {
          portfolioVol: 35,
          realizedVol: 32,
          impliedVol: 40,
          volHistory: []
        }
      })
    }))

    render(<RiskDashboard />)

    await screen.findByText(/Leverage/)

    // Check warning indicators
    expect(screen.getByTestId('leverage-warning')).toBeInTheDocument()
    expect(screen.getByTestId('drawdown-warning')).toBeInTheDocument()
    expect(screen.getByTestId('var-warning')).toBeInTheDocument()
  })

  it('should handle loading state', () => {
    render(<RiskDashboard />)

    expect(screen.getByText(/Loading risk metrics.../)).toBeInTheDocument()
  })

  it('should handle error state', async () => {
    const { ApiService } = require('@/services/ApiService')
    ApiService.mockImplementation(() => ({
      getRiskMetrics: jest.fn().mockRejectedValue(new Error('API Error'))
    }))

    render(<RiskDashboard />)

    await screen.findByText(/Failed to load risk metrics/)
    expect(screen.getByText(/Retry/)).toBeInTheDocument()
  })

  it('should refresh data on retry', async () => {
    const { ApiService } = require('@/services/ApiService')
    const mockGetRiskMetrics = jest.fn()
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        portfolioValue: 100000,
        // ... other metrics
      })

    ApiService.mockImplementation(() => ({
      getRiskMetrics: mockGetRiskMetrics
    }))

    const user = userEvent.setup()
    render(<RiskDashboard />)

    await screen.findByText(/Failed to load risk metrics/)
    
    const retryButton = screen.getByText(/Retry/)
    await user.click(retryButton)

    await screen.findByText(/Portfolio Value/)
    expect(mockGetRiskMetrics).toHaveBeenCalledTimes(2)
  })

  it('should auto-refresh data every 30 seconds', async () => {
    const { ApiService } = require('@/services/ApiService')
    const mockGetRiskMetrics = jest.fn().mockResolvedValue({
      portfolioValue: 100000,
      // ... other metrics
    })

    ApiService.mockImplementation(() => ({
      getRiskMetrics: mockGetRiskMetrics
    }))

    jest.useFakeTimers()
    render(<RiskDashboard />)

    await screen.findByText(/Portfolio Value/)
    expect(mockGetRiskMetrics).toHaveBeenCalledTimes(1)

    // Fast forward 30 seconds
    jest.advanceTimersByTime(30000)

    expect(mockGetRiskMetrics).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
  })

  it('should show tooltips on hover', async () => {
    const user = userEvent.setup()
    render(<RiskDashboard />)

    await screen.findByText(/Sharpe Ratio/)

    const sharpeLabel = screen.getByText(/Sharpe Ratio/)
    await user.hover(sharpeLabel)

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      /Risk-adjusted returns relative to volatility/
    )
  })

  it('should expand/collapse sections', async () => {
    const user = userEvent.setup()
    render(<RiskDashboard />)

    await screen.findByText('Risk Metrics')

    const riskMetricsHeader = screen.getByText('Risk Metrics')
    await user.click(riskMetricsHeader)

    // Section should be collapsed
    expect(screen.queryByText(/Sharpe Ratio/)).not.toBeInTheDocument()

    await user.click(riskMetricsHeader)

    // Section should be expanded again
    expect(screen.getByText(/Sharpe Ratio/)).toBeInTheDocument()
  })

  it('should format numbers correctly', async () => {
    render(<RiskDashboard />)

    await screen.findByText(/Portfolio Value/)

    // Check currency formatting
    expect(screen.getByText('$100,000.00')).toBeInTheDocument()
    
    // Check percentage formatting
    expect(screen.getByText('5.20%')).toBeInTheDocument() // Current drawdown
    
    // Check decimal formatting
    expect(screen.getByText('1.35')).toBeInTheDocument() // Sharpe ratio
  })
})