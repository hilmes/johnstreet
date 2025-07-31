# Simplified Component Architecture Specifications

## Core Philosophy
- **Signal**: Clear, unambiguous trading signals
- **Execute**: One-click trade execution  
- **Track**: Simple P&L monitoring
- **Eliminate Choice Paralysis**: Reduce options to essential actions

## Component Hierarchy

```
Essential Trading Components/
├── UnifiedDashboard.tsx           # Single-screen layout
├── SignalIndicator.tsx            # Primary signal display
├── ExecutionPanel.tsx             # One-click trading
├── PerformanceTracker.tsx         # Simple P&L tracking
└── shared/
    ├── MinimalCard.tsx            # Single card component  
    ├── PriorityButton.tsx         # Action-focused button
    └── LiveIndicator.tsx          # Real-time status
```

## 1. SignalIndicator Component

### Purpose
Primary trading signal display that eliminates analysis paralysis by showing only the most critical information.

### Props Interface
```typescript
interface SignalIndicatorProps {
  signal: TradingSignal
  onAccept: (signal: TradingSignal) => void
  onDismiss: (signalId: string) => void
  showDetails?: boolean
}
```

### Key Features
- **Single Primary Signal**: Only shows the highest priority signal
- **Traffic Light System**: Green (BUY), Red (SELL), Yellow (CAUTION)
- **Confidence Visualization**: Progress bar showing signal strength
- **Time Decay**: Visual countdown showing signal expiration
- **One-Click Actions**: Accept/Dismiss buttons prominently displayed

### Visual Design
- Large, centered display with minimal text
- Color-coded background matching signal action
- Animated confidence meter
- Prominent action buttons at bottom
- Small metadata in footer (timeframe, source)

### State Management
```typescript
interface SignalState {
  currentSignal: TradingSignal | null
  isAccepting: boolean
  isDismissing: boolean
  timeRemaining: number
}
```

## 2. ExecutionPanel Component

### Purpose
One-click trading interface that removes complex order types and focuses on immediate execution.

### Props Interface
```typescript
interface ExecutionPanelProps {
  signal: TradingSignal
  balance: number
  position?: Position
  onExecute: (order: SimpleOrder) => void
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
}
```

### Key Features
- **Pre-calculated Position Size**: Based on risk profile
- **Market Orders Only**: No complex order types
- **Single Execute Button**: Large, prominent action button
- **Risk Summary**: Shows $ amount at risk
- **Balance Check**: Prevents over-leveraging

### Visual Design
- Minimal form with pre-filled values
- Large execute button matching signal color
- Risk metrics displayed prominently
- Balance/position info in header
- Confirmation modal for large trades

### State Management
```typescript
interface ExecutionState {
  calculatedSize: number
  riskAmount: number
  isExecuting: boolean
  requiresConfirmation: boolean
}
```

## 3. PerformanceTracker Component

### Purpose
Simple P&L tracking focused on today's performance and open positions.

### Props Interface
```typescript
interface PerformanceTrackerProps {
  dailyPnL: number
  totalPortfolioValue: number
  openPositions: Position[]
  onClosePosition?: (positionId: string) => void
}
```

### Key Features
- **Today's P&L**: Large display of daily performance
- **Portfolio Value**: Current total value
- **Open Positions**: Simple list with close buttons
- **Performance Chart**: Minimal sparkline showing daily trend
- **Quick Stats**: Win rate, best/worst trade

### Visual Design
- Clean card layout with minimal text
- Large P&L number with color coding
- Horizontal position list with one-click close
- Small sparkline chart
- Minimal stats in footer

### State Management
```typescript
interface PerformanceState {
  positions: Position[]
  isClosingPosition: string | null
  chartData: number[]
}
```

## 4. UnifiedDashboard Component

### Purpose
Single-screen layout that eliminates navigation and presents all essential information.

### Props Interface
```typescript
interface UnifiedDashboardProps {
  signals: TradingSignal[]
  portfolio: PortfolioData
  settings: TradingSettings
}
```

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│                 Header (Logo + Status)              │
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│   SignalIndicator   │     PerformanceTracker       │
│   (Primary Signal)  │     (Today's P&L)             │
│                     │                               │
├─────────────────────┼───────────────────────────────┤
│                     │                               │
│   ExecutionPanel    │     Quick Positions           │
│   (One-Click Trade) │     (Open Positions)          │
│                     │                               │
└─────────────────────┴───────────────────────────────┘
```

### Key Features
- **No Navigation**: Everything on one screen
- **Responsive Grid**: 2x2 on desktop, stacked on mobile
- **Real-time Updates**: WebSocket-driven data
- **Minimal UI**: Clean, uncluttered design
- **Focus Mode**: Dims inactive areas

## 5. Shared Components

### MinimalCard
```typescript
interface MinimalCardProps {
  title?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'inactive' | 'warning'
  children: React.ReactNode
  onClick?: () => void
}
```

### PriorityButton
```typescript
interface PriorityButtonProps {
  action: 'buy' | 'sell' | 'close' | 'cancel'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  onClick: () => void
  children: React.ReactNode
}
```

### LiveIndicator
```typescript
interface LiveIndicatorProps {
  status: 'connected' | 'disconnected' | 'error'
  lastUpdate?: Date
  label?: string
}
```

## Data Flow Architecture

### WebSocket Integration
```typescript
// Real-time signal updates
useWebSocket('/api/ws/signals', {
  onMessage: (signal: TradingSignal) => {
    setCurrentSignal(signal)
  }
})

// Portfolio updates
useWebSocket('/api/ws/portfolio', {
  onMessage: (portfolio: PortfolioData) => {
    setPortfolioData(portfolio)
  }
})
```

### State Management Pattern
```typescript
// Simplified global state
interface TradingState {
  signal: TradingSignal | null
  portfolio: PortfolioData
  isExecuting: boolean
  settings: TradingSettings
}

// Single reducer for all actions
type TradingAction = 
  | { type: 'SET_SIGNAL'; payload: TradingSignal }
  | { type: 'EXECUTE_TRADE'; payload: SimpleOrder }
  | { type: 'UPDATE_PORTFOLIO'; payload: PortfolioData }
```

## Migration Strategy

### Phase 1: Core Components (Week 1)
1. Create MinimalCard shared component
2. Build SignalIndicator with mock data
3. Implement basic ExecutionPanel
4. Test components in isolation

### Phase 2: Integration (Week 2)
1. Create UnifiedDashboard layout
2. Integrate real-time data feeds
3. Connect to existing trading APIs
4. Add error handling and loading states

### Phase 3: Enhancement (Week 3)
1. Add PerformanceTracker component
2. Implement WebSocket connections
3. Add animations and micro-interactions
4. Performance optimization

### Phase 4: Migration (Week 4)
1. Create feature flag for new UI
2. A/B test with existing dashboard
3. Migrate user preferences
4. Remove deprecated components

## Key Principles

### Design Guidelines
- **Maximum 3 Colors**: Green (buy), Red (sell), Gray (neutral)
- **Single Action Per Component**: No multi-function components
- **No More Than 7 Items**: Limit choices using Miller's Rule
- **Immediate Feedback**: Every action provides instant visual response
- **Progressive Disclosure**: Advanced features hidden by default

### Technical Standards
- **Edge Runtime Compatible**: All components work with Vercel Edge
- **TypeScript Strict**: Full type safety with no any types
- **Test Coverage**: 100% coverage for business logic
- **Performance**: <100ms response time for all interactions
- **Accessibility**: WCAG 2.1 AA compliance

### Error Handling
- **Graceful Degradation**: System works even if signals fail
- **Clear Error Messages**: User-friendly error descriptions
- **Retry Mechanisms**: Automatic retry for transient failures
- **Fallback UI**: Minimal UI when data unavailable