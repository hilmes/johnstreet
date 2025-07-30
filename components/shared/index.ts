/**
 * Shared Component Library
 * 
 * Centralized, reusable components following AI-GUIDELINES.md standards:
 * - Modular design with clear separation of concerns
 * - TypeScript-first with comprehensive type definitions
 * - Consistent error handling and performance optimization
 * - Accessible components meeting WCAG 2.1 AA standards
 */

// Core UI Components
export { Button } from './ui/Button'
export { Input } from './ui/Input'
export { Card } from './ui/Card'
export { Badge } from './ui/Badge'
export { Avatar } from './ui/Avatar'
export { Modal } from './ui/Modal'
export { Tooltip } from './ui/Tooltip'
export { Spinner } from './ui/Spinner'

// Form Components
export { FormField } from './forms/FormField'
export { FormGroup } from './forms/FormGroup'
export { Select } from './forms/Select'
export { Checkbox } from './forms/Checkbox'
export { RadioGroup } from './forms/RadioGroup'

// Data Display Components
export { DataTable } from './data/DataTable'
export { MetricCard } from './data/MetricCard'
export { ProgressBar } from './data/ProgressBar'
export { StatusIndicator } from './data/StatusIndicator'

// Layout Components
export { Container } from './layout/Container'
export { Grid } from './layout/Grid'
export { Stack } from './layout/Stack'
export { Divider } from './layout/Divider'

// Feedback Components
export { Alert } from './feedback/Alert'
export { Toast } from './feedback/Toast'
export { EmptyState } from './feedback/EmptyState'
export { LoadingState } from './feedback/LoadingState'

// Navigation Components
export { Breadcrumb } from './navigation/Breadcrumb'
export { Tabs } from './navigation/Tabs'
export { Pagination } from './navigation/Pagination'

// Trading-Specific Components
export { PriceDisplay } from './trading/PriceDisplay'
export { PercentageChange } from './trading/PercentageChange'
export { TradingSymbol } from './trading/TradingSymbol'
export { OrderStatus } from './trading/OrderStatus'

// Types
export type * from './types'