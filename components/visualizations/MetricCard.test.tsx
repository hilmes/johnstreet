import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MetricCard from './MetricCard'
import { DesignSystem } from '@/lib/design/DesignSystem'

// Mock the Sparkline component
jest.mock('./Sparkline', () => {
  return function MockSparkline({ data }: { data: number[] }) {
    return <div data-testid="sparkline">Sparkline: {data.length} points</div>
  }
})

// Mock MUI icons
jest.mock('@mui/icons-material', () => ({
  TrendingUp: () => <span data-testid="trending-up">↑</span>,
  TrendingDown: () => <span data-testid="trending-down">↓</span>,
  TrendingFlat: () => <span data-testid="trending-flat">→</span>,
}))

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: 125000,
  }

  it('should render basic metric card', () => {
    render(<MetricCard {...defaultProps} />)
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('125000')).toBeInTheDocument()
  })

  it('should format value when format function is provided', () => {
    const formatter = (value: number) => `$${value.toLocaleString()}`
    render(<MetricCard {...defaultProps} format={formatter} />)
    
    expect(screen.getByText('$125,000')).toBeInTheDocument()
  })

  it('should show positive change with trend icon', () => {
    render(<MetricCard {...defaultProps} change={15.5} />)
    
    expect(screen.getByTestId('trending-up')).toBeInTheDocument()
    expect(screen.getByText('+15.5%')).toBeInTheDocument()
  })

  it('should show negative change with trend icon', () => {
    render(<MetricCard {...defaultProps} change={-8.2} />)
    
    expect(screen.getByTestId('trending-down')).toBeInTheDocument()
    expect(screen.getByText('-8.2%')).toBeInTheDocument()
  })

  it('should show neutral change with flat icon', () => {
    render(<MetricCard {...defaultProps} change={0} />)
    
    expect(screen.getByTestId('trending-flat')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should show change label when provided', () => {
    render(<MetricCard {...defaultProps} change={10} changeLabel="vs last month" />)
    
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('should show subtitle when provided', () => {
    render(<MetricCard {...defaultProps} subtitle="Last updated: 5 mins ago" />)
    
    expect(screen.getByText('Last updated: 5 mins ago')).toBeInTheDocument()
  })

  it('should render sparkline when data is provided', () => {
    const sparklineData = [100, 120, 115, 130, 125]
    render(<MetricCard {...defaultProps} sparklineData={sparklineData} />)
    
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
    expect(screen.getByText('Sparkline: 5 points')).toBeInTheDocument()
  })

  it('should handle dense mode', () => {
    const { container } = render(<MetricCard {...defaultProps} dense />)
    
    // Check if dense styling is applied (smaller padding)
    const card = container.querySelector('.MuiCard-root')
    expect(card).toHaveStyle({
      padding: `${DesignSystem.spacing[3]}px`
    })
  })

  it('should handle onClick event', () => {
    const handleClick = jest.fn()
    render(<MetricCard {...defaultProps} onClick={handleClick} />)
    
    const card = screen.getByText('Total Revenue').closest('.MuiCard-root')
    fireEvent.click(card!)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should apply hover styles when clickable', () => {
    const handleClick = jest.fn()
    const { container } = render(<MetricCard {...defaultProps} onClick={handleClick} />)
    
    const card = container.querySelector('.MuiCard-root')
    expect(card).toHaveStyle({
      cursor: 'pointer'
    })
  })

  it('should not apply hover styles when not clickable', () => {
    const { container } = render(<MetricCard {...defaultProps} />)
    
    const card = container.querySelector('.MuiCard-root')
    expect(card).toHaveStyle({
      cursor: 'default'
    })
  })

  it('should handle string values', () => {
    render(<MetricCard title="Status" value="Active" />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should apply correct colors for different change values', () => {
    const { rerender } = render(<MetricCard {...defaultProps} change={10} />)
    let changeText = screen.getByText('+10%')
    expect(changeText).toHaveStyle({ color: DesignSystem.colors.market.up })
    
    rerender(<MetricCard {...defaultProps} change={-10} />)
    changeText = screen.getByText('-10%')
    expect(changeText).toHaveStyle({ color: DesignSystem.colors.market.down })
    
    rerender(<MetricCard {...defaultProps} change={0} />)
    changeText = screen.getByText('0%')
    expect(changeText).toHaveStyle({ color: DesignSystem.colors.neutral[600] })
  })

  it('should format change value when formatter is provided', () => {
    const formatter = (value: number) => `${value.toFixed(1)} pts`
    render(<MetricCard {...defaultProps} change={12.345} format={formatter} />)
    
    expect(screen.getByText('+12.3 pts')).toBeInTheDocument()
  })

  it('should handle edge cases gracefully', () => {
    // Empty title
    render(<MetricCard title="" value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    
    // Very large numbers
    render(<MetricCard title="Large Number" value={9999999999} />)
    expect(screen.getByText('9999999999')).toBeInTheDocument()
    
    // Special characters in title
    render(<MetricCard title="Revenue ($)" value="1000" />)
    expect(screen.getByText('Revenue ($)')).toBeInTheDocument()
  })

  it('should render sparkline with correct dimensions in dense mode', () => {
    const sparklineData = [1, 2, 3, 4, 5]
    render(<MetricCard {...defaultProps} sparklineData={sparklineData} dense />)
    
    const sparkline = screen.getByTestId('sparkline')
    expect(sparkline).toBeInTheDocument()
  })

  it('should prioritize change display over subtitle', () => {
    render(
      <MetricCard 
        {...defaultProps} 
        change={5} 
        subtitle="This should not appear" 
      />
    )
    
    expect(screen.getByText('+5%')).toBeInTheDocument()
    expect(screen.queryByText('This should not appear')).not.toBeInTheDocument()
  })
})