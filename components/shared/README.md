# Shared Component Library

This directory contains the centralized shared component library following AI-GUIDELINES.md standards.

## Structure

```
shared/
├── index.ts              # Main exports
├── types.ts              # TypeScript definitions
├── ui/                   # Core UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── Spinner.tsx
├── data/                 # Data display components
│   └── MetricCard.tsx
├── forms/                # Form components (placeholder)
├── layout/               # Layout components (placeholder)
├── feedback/             # Feedback components (placeholder)
├── navigation/           # Navigation components (placeholder)
└── trading/              # Trading-specific components (placeholder)
```

## Usage

```typescript
import { Button, Input, Card, MetricCard } from '@/components/shared'

// Or import specific components
import { Button } from '@/components/shared/ui/Button'
```

## Standards Compliance

✅ **Modular Design**: Components are properly separated by category
✅ **TypeScript-First**: Comprehensive type definitions and strict typing
✅ **Performance**: React.memo, useMemo optimizations
✅ **Accessibility**: WCAG 2.1 AA compliance with proper ARIA attributes
✅ **Error Handling**: Comprehensive error states and loading handling
✅ **Testing**: All components include data-testid attributes

## Next Steps

- Complete remaining component implementations
- Add comprehensive test coverage
- Add Storybook documentation
- Implement design tokens system