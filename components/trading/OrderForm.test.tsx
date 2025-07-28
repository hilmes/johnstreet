import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderForm } from './OrderForm'

describe('OrderForm', () => {
  const defaultProps = {
    symbol: 'BTC/USD',
    marketData: {
      bid: 43500,
      ask: 43600,
      last: 43550
    },
    availableBalance: 10000
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render order form with default values', () => {
    render(<OrderForm {...defaultProps} />)

    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buy/i })).toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: /sell/i })).not.toHaveClass('bg-primary')
    expect(screen.getByText('Limit')).toBeInTheDocument()
  })

  it('should switch between buy and sell sides', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const sellButton = screen.getByRole('button', { name: /sell/i })
    await user.click(sellButton)

    expect(sellButton).toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: /buy/i })).not.toHaveClass('bg-primary')
  })

  it('should switch between order types', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    // Click on order type select (assuming it's a select element)
    const orderTypeSelect = screen.getByRole('combobox')
    await user.selectOptions(orderTypeSelect, 'market')

    expect(orderTypeSelect).toHaveValue('market')
  })

  it('should calculate total when amount and price change', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const amountInput = screen.getByPlaceholderText('0.00')
    const priceInput = screen.getByPlaceholderText('0.00', { exact: false })

    await user.type(amountInput, '0.5')
    await user.clear(priceInput)
    await user.type(priceInput, '44000')

    await waitFor(() => {
      expect(screen.getByText(/22,000/)).toBeInTheDocument() // Total should be 0.5 * 44000 = 22000
    })
  })

  it('should show price field for limit orders', () => {
    render(<OrderForm {...defaultProps} />)

    expect(screen.getByLabelText(/Price/)).toBeInTheDocument()
  })

  it('should hide price field for market orders', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const orderTypeSelect = screen.getByRole('combobox')
    await user.selectOptions(orderTypeSelect, 'market')

    expect(screen.queryByLabelText(/^Price$/)).not.toBeInTheDocument()
  })

  it('should show stop price field for stop orders', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const orderTypeSelect = screen.getByRole('combobox')
    await user.selectOptions(orderTypeSelect, 'stop')

    expect(screen.getByLabelText(/Stop Price/)).toBeInTheDocument()
  })

  it('should show both price and stop price for stop limit orders', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const orderTypeSelect = screen.getByRole('combobox')
    await user.selectOptions(orderTypeSelect, 'stopLimit')

    expect(screen.getByLabelText(/^Price$/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Stop Price/)).toBeInTheDocument()
  })

  it('should validate amount field', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()
  })

  it('should validate price field for limit orders', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const amountInput = screen.getByPlaceholderText('0.00')
    await user.type(amountInput, '1')

    const priceInput = screen.getByPlaceholderText('0.00', { exact: false })
    await user.clear(priceInput)

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument()
  })

  it('should validate stop price for stop orders', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const orderTypeSelect = screen.getByRole('combobox')
    await user.selectOptions(orderTypeSelect, 'stop')

    const amountInput = screen.getByPlaceholderText('0.00')
    await user.type(amountInput, '1')

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    expect(screen.getByText('Stop price must be greater than 0')).toBeInTheDocument()
  })

  it('should validate insufficient balance', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const amountInput = screen.getByPlaceholderText('0.00')
    const priceInput = screen.getByPlaceholderText('0.00', { exact: false })

    await user.type(amountInput, '1')
    await user.clear(priceInput)
    await user.type(priceInput, '50000') // Total = 50000, but balance is only 10000

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
  })

  it('should submit valid order', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<OrderForm {...defaultProps} />)

    const amountInput = screen.getByPlaceholderText('0.00')
    const priceInput = screen.getByPlaceholderText('0.00', { exact: false })

    await user.type(amountInput, '0.1')
    await user.clear(priceInput)
    await user.type(priceInput, '44000')

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Order submitted:', {
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'limit',
        amount: '0.1',
        price: '44000',
        stopPrice: '',
        total: 4400
      })
    })

    consoleSpy.mockRestore()
  })

  it('should handle market order submission', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<OrderForm {...defaultProps} />)

    const orderTypeSelect = screen.getByRole('combobox')
    await user.selectOptions(orderTypeSelect, 'market')

    const amountInput = screen.getByPlaceholderText('0.00')
    await user.type(amountInput, '0.1')

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Order submitted:', 
        expect.objectContaining({
          type: 'market',
          amount: '0.1',
          total: 0.1 * 43550 // Uses last price for market orders
        })
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle null market data', () => {
    render(<OrderForm {...defaultProps} marketData={null} />)

    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('should show advanced options when clicked', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const advancedButton = screen.getByRole('button', { name: /advanced/i })
    await user.click(advancedButton)

    // Assuming advanced options show additional fields
    expect(screen.getByText(/Time in Force/i)).toBeInTheDocument()
  })

  it('should show loading state when validating', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const amountInput = screen.getByPlaceholderText('0.00')
    const priceInput = screen.getByPlaceholderText('0.00', { exact: false })

    await user.type(amountInput, '0.1')
    await user.clear(priceInput)
    await user.type(priceInput, '44000')

    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    expect(screen.getByText(/validating/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument()
    })
  })

  it('should update price with market data for sell orders', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const sellButton = screen.getByRole('button', { name: /sell/i })
    await user.click(sellButton)

    // For sell orders, it might default to bid price
    const priceInput = screen.getByPlaceholderText('0.00', { exact: false }) as HTMLInputElement
    expect(priceInput.value).toBe('43500') // Bid price
  })

  it('should clear errors when correcting input', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    // Submit without amount to trigger error
    const submitButton = screen.getByRole('button', { name: /place.*order/i })
    await user.click(submitButton)

    expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()

    // Now enter valid amount
    const amountInput = screen.getByPlaceholderText('0.00')
    await user.type(amountInput, '0.1')

    // Error should be cleared
    expect(screen.queryByText('Amount must be greater than 0')).not.toBeInTheDocument()
  })

  it('should format large numbers with commas', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} availableBalance={1000000} />)

    expect(screen.getByText(/1,000,000/)).toBeInTheDocument() // Available balance
  })

  it('should handle decimal amounts correctly', async () => {
    const user = userEvent.setup()
    render(<OrderForm {...defaultProps} />)

    const amountInput = screen.getByPlaceholderText('0.00')
    await user.type(amountInput, '0.12345')

    expect(amountInput).toHaveValue('0.12345')
  })
})