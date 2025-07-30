---
description: 
globs: 
alwaysApply: true
---
# AI-Assisted Development Guidelines
*Embody grace and simplicity and user accessibility. Kaizen.*

## MCP Tools Integration

Our development workflow leverages Model Context Protocol (MCP) tools to enhance productivity and maintain quality:

- **Memory** (`memory`): Persistent knowledge graph for project context and standards
- **Sequential Thinking** (`sequential-thinking`): Structured problem-solving for complex tasks
- **Puppeteer** (`puppeteer`): Automated testing and visual verification

## Core Development Principles

```javascript
// Store component standards in persistent memory
await mcp.memory_create_entities({
  entities: [{
    name: "ComponentStandards",
    entityType: "DevelopmentStandard",
    observations: [
      "Make codebase modular, not monolithic",
      "Target file size ~500 lines (±100 lines)"
    ]
  }]
});
```

- Make our codebase as modular as possible, not monolithic
- Files should be around ~500 lines in length (+/- 100 lines)
- Component files should follow size guidelines:
  - UI Components: 50-150 lines (pure presentation components)
  - Container Components: 100-300 lines (data/state management)
  - Page Components: 200-400 lines (composition of smaller components)
- Split components when:
  - Handling multiple distinct responsibilities
  - Conditional rendering becomes complex
  - Component accepts too many props (7-10+)
  - Readability decreases (requires excessive scrolling)
  - Parts could be reused elsewhere in the application

### Component Analysis with Sequential Thinking

```javascript
// Use structured reasoning to analyze component complexity
await mcp.mcp_sequential-thinking_sequentialthinking({
  thought: "Analyzing InspectionTracker component for potential splitting points",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
});
```

## Code Quality & Standards

```javascript
// Store quality standards in memory for consistent reference
await mcp.memory_create_entities({
  entities: [{
    name: "CodeQualityStandards",
    entityType: "DevelopmentStandard",
    observations: [
      "TypeScript-first approach with strict typing",
      "ES module syntax required",
      "Comprehensive error handling for all async operations"
    ]
  }]
});
```

- Follow project conventions: Always adhere to existing code style, naming conventions, and project structure
- TypeScript first: Use TypeScript for all new files with proper type definitions
- Use ES module syntax
- Error handling: Implement comprehensive error handling for all API calls and async operations
- Documentation: Add JSDoc comments for all functions, classes, and complex code blocks
- Configure AI rules to automatically enforce coding standards

### Quality Verification with Puppeteer

```javascript
// Automated verification of component rendering
await mcp.mcp_puppeteer_puppeteer_navigate({
  url: "http://localhost:3000/component-sandbox"
});
await mcp.mcp_puppeteer_puppeteer_screenshot({
  name: "component-verification",
  selector: ".target-component"
});
```

## API and Data Management

```javascript
// Document API patterns in memory
await mcp.memory_create_entities({
  entities: [{
    name: "JetNetApiStandards",
    entityType: "ApiStandard",
    observations: [
      "Always pass token in header when using JetNetApi",
      "Use SWR or React Query for data fetching and caching",
      "Implement automatic token renewal logic"
    ]
  }]
});
```

- Always pass token in header when using JetNetApi (as per documentation)
- Implement appropriate caching strategies for API responses
- Handle all potential error states from APIs
- Implement exponential backoff for failed requests
- Log all API interactions at appropriate levels (debug vs. error)
- Implement automatic token renewal logic when tokens expire
- Use centralized API client configuration
- Use SWR or React Query for data fetching and caching
- Use Zod or similar libraries for runtime data validation

### API Integration Planning

```javascript
// Use sequential thinking for API implementation planning
await mcp.mcp_sequential-thinking_sequentialthinking({
  thought: "Designing caching strategy for aircraft data endpoints",
  thoughtNumber: 1,
  totalThoughts: 4,
  nextThoughtNeeded: true
});
```

## Authentication & Security

```javascript
// Document security requirements in memory
await mcp.memory_create_entities({
  entities: [{
    name: "SecurityStandards",
    entityType: "SecurityRequirement",
    observations: [
      "Use Auth.js (NextAuth v5+) for OAuth",
      "Sanitize all user inputs",
      "Store secrets in environment variables only"
    ]
  }]
});
```

- Use Auth.js (NextAuth v5 or higher) for OAuth
- Sanitize inputs: Validate and sanitize all user inputs
- Avoid hard-coded secrets: Never include API keys, tokens, or passwords in code
- Implement CSRF protection for all form submissions
- Use React's built-in XSS protections; avoid dangerouslySetInnerHTML
- Implement rate limiting for API endpoints
- Use automated tools to scan for security vulnerabilities

### Security Testing

```javascript
// Test authentication flows with Puppeteer
await mcp.mcp_puppeteer_puppeteer_navigate({
  url: "http://localhost:3000/api/auth/signin"
});
await mcp.mcp_puppeteer_puppeteer_fill({
  selector: "input[name='email']",
  value: "test@example.com"
});
```

## Performance Optimization

```javascript
// Track performance requirements in memory
await mcp.memory_create_entities({
  entities: [{
    name: "PerformanceStandards",
    entityType: "OptimizationRequirement",
    observations: [
      "Configure Edge Runtime for all API routes",
      "Use React.memo, useMemo, and useCallback appropriately",
      "Implement lazy loading for routes and large components"
    ]
  }]
});
```

- Edge Runtime for Vercel should be configured properly for all API routes
- Memoization: Use React.memo, useMemo, and useCallback appropriately
- Regular bundle size analysis with optimizations
- Implement lazy loading for routes and large components
- Use next/image or similar for image optimization
- Break down large components to improve code splitting
- Regularly review and optimize critical paths

### Performance Testing

```javascript
// Measure performance with Puppeteer
await mcp.mcp_puppeteer_puppeteer_evaluate({
  script: `
    performance.mark('start-render');
    // Code to test
    performance.mark('end-render');
    performance.measure('render-time', 'start-render', 'end-render');
    return performance.getEntriesByType('measure');
  `
});
```

## File & Component Organization

```javascript
// Document organization patterns in memory
await mcp.memory_create_entities({
  entities: [{
    name: "FileOrganizationStandards",
    entityType: "OrganizationStandard",
    observations: [
      "Group related components in directories",
      "Use partials folders for component-specific sub-components",
      "Create shared/common component libraries"
    ]
  }]
});
```

- Group related components in directories
- Use "partials" folders for component-specific sub-components
- Create shared/common component libraries for reusable elements
- Implement project-wide patterns and refactoring consistently
- Review all code changes before applying

### Organization Analysis

```javascript
// Analyze project structure with Sequential Thinking
await mcp.mcp_sequential-thinking_sequentialthinking({
  thought: "Evaluating current component organization and identifying improvements",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true
});
```

## Development Workflow

```javascript
// Store workflow guidelines in memory
await mcp.memory_create_entities({
  entities: [{
    name: "DevelopmentWorkflow",
    entityType: "WorkflowStandard",
    observations: [
      "Never use mock data",
      "Ask before installing new dependencies",
      "Use startup command: (lsof -i :3000,3001 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null; npm run dev) & npx @agentdeskai/browser-tools-server"
    ]
  }]
});
```

- Never use mock data
- Ask before installing new dependencies
- Always use the prescribed startup command
- Enable Turbopack with the --turbopack flag
- Don't change ports without asking
- Implement feature flags for larger changes
- Clear local storage when schema changes
- Ensure all UI components meet WCAG 2.1 AA standards
- Schedule regular code cleanup sessions

### Workflow Automation

```javascript
// Test workflow with Puppeteer
await mcp.mcp_puppeteer_puppeteer_navigate({
  url: "http://localhost:3000/development-status"
});
await mcp.mcp_puppeteer_puppeteer_screenshot({
  name: "workflow-verification"
});
```

## AI-Assisted Development

```javascript
// Track AI assistance patterns in memory
await mcp.memory_create_entities({
  entities: [{
    name: "AIAssistanceGuidelines",
    entityType: "DevelopmentStandard",
    observations: [
      "Reference project documentation in AI prompts",
      "Provide component purpose and design patterns in prompts",
      "Use iterative approach for complex changes"
    ]
  }]
});
```

- Reference project documentation in AI prompts
- Provide context about component purpose and design patterns in use
- Use iterative approach for complex changes (generate, review, refine)
- Include error handling expectations and performance requirements in prompts
- Generate tests when creating new functionality
- Use follow-up questions to improve generated code

### AI-Assistance Enhancement

```javascript
// Use Sequential Thinking for complex problems
await mcp.mcp_sequential-thinking_sequentialthinking({
  thought: "Designing optimal API caching strategy for aircraft data",
  thoughtNumber: 1,
  totalThoughts: 6,
  nextThoughtNeeded: true
});
```

## Version Control & Deployment

```javascript
// Document deployment procedures in memory
await mcp.memory_create_entities({
  entities: [{
    name: "DeploymentStandards",
    entityType: "DeploymentGuideline",
    observations: [
      "Make small, focused commits with clear messages",
      "Follow Git Flow branching strategy",
      "Create release notes in /docs/release-notes before deployment"
    ]
  }]
});
```

- Atomic commits: Make small, focused commits with clear messages
- Follow Git Flow or similar branching strategy
- Generate a checklist for code reviews
- Use standardized PR templates
- Create detailed release notes before every deployment
- Use Vercel CLI commands for deployments
- Ensure environment variables are properly configured

### Deployment Verification

```javascript
// Verify deployment with Puppeteer
await mcp.mcp_puppeteer_puppeteer_navigate({
  url: "https://preview-deployment-url.vercel.app"
});
await mcp.mcp_puppeteer_puppeteer_screenshot({
  name: "deployment-verification"
});
```

## Debugging and Monitoring

```javascript
// Document debugging procedures in memory
await mcp.memory_create_entities({
  entities: [{
    name: "DebuggingStandards",
    entityType: "DebuggingGuideline",
    observations: [
      "Use consistent logging format",
      "Add performance marks for critical user flows",
      "Integrate with error tracking service"
    ]
  }]
});
```

- Structured logging: Use a consistent logging format
- Performance monitoring: Add performance marks for critical user flows
- Error tracking: Integrate with error tracking service
- User analytics: Implement analytics for key user actions
- Regularly analyze and improve error handling patterns

### Debugging Assistance

```javascript
// Use Sequential Thinking for complex debugging
await mcp.mcp_sequential-thinking_sequentialthinking({
  thought: "Debugging SSR hydration mismatch in aircraft component",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
});
```

## Testing Standards

```javascript
// Document testing requirements in memory
await mcp.memory_create_entities({
  entities: [{
    name: "TestingStandards",
    entityType: "TestingGuideline",
    observations: [
      "Unit tests with Jest/Vitest targeting >80% coverage",
      "Integration tests for all API endpoints",
      "E2E tests for critical user journeys with Puppeteer"
    ]
  }]
});
```

- Unit tests: Jest/Vitest with >80% coverage for business logic
- Integration tests: API endpoint validation with proper mocking
- E2E tests: Critical user journey validation with Puppeteer
- Test file naming: `*.test.js`, `*.spec.js`, or `*.test.ts` for TypeScript
- Test structure: Arrange-Act-Assert pattern
- Mock external dependencies and API calls
- Run tests before committing: `npm test` or project-specific test command
- Write tests when fixing bugs to prevent regression
- Use test data builders for complex objects

### Test Implementation Example

```javascript
// Example test structure
describe('AircraftComponent', () => {
  it('should render aircraft details correctly', async () => {
    // Arrange
    const mockAircraft = buildAircraftData();
    
    // Act
    const { getByText } = render(<AircraftComponent data={mockAircraft} />);
    
    // Assert
    expect(getByText(mockAircraft.model)).toBeInTheDocument();
  });
});
```

## Claude Code Workflow

```javascript
// Document Claude Code best practices in memory
await mcp.memory_create_entities({
  entities: [{
    name: "ClaudeCodeWorkflow",
    entityType: "WorkflowGuideline",
    observations: [
      "Use TodoWrite for tasks with 3+ steps",
      "Prefer Task tool for open-ended searches",
      "Run linting/type checking after code changes"
    ]
  }]
});
```

- Use TodoWrite for tasks with 3+ steps or complex multi-file changes
- Prefer Task tool for open-ended searches requiring multiple rounds
- Use Read for specific files, Glob for patterns, Grep for content search
- Always run linting/type checking after code changes
- Check for existing test/lint commands in package.json before asking
- Use `make tail-logs` for debugging when working with unified logging
- Reference file locations with `path/to/file.js:lineNumber` format
- Batch multiple tool calls when gathering information
- Write to CLAUDE.md for project-specific instructions that persist

### Tool Selection Guide

```javascript
// Example: Choosing the right search tool
// Use Glob when you know the file pattern
await glob({ pattern: "**/*Controller.js" });

// Use Grep when searching for specific content
await grep({ pattern: "handleSubmit", glob: "*.tsx" });

// Use Task when search is complex or iterative
await task({ 
  prompt: "Find all API endpoints that handle authentication",
  subagent_type: "general-purpose"
});
```

## Project Documentation

```javascript
// Track documentation requirements in memory
await mcp.memory_create_entities({
  entities: [{
    name: "DocumentationStandards",
    entityType: "DocumentationGuideline",
    observations: [
      "Update architecture diagrams when architecture changes",
      "Maintain up-to-date API documentation",
      "Keep developer onboarding guide updated"
    ]
  }]
});
```

- Update architecture diagrams when architecture changes
- Maintain up-to-date API documentation
- Keep the developer onboarding guide updated
- Maintain a user-facing changelog for significant updates
- Document Vercel-specific deployment configurations
- Document component purpose, props, and usage examples

### Knowledge Preservation

```javascript
// Store project knowledge persistently
await mcp.memory_create_relations({
  relations: [
    {
      from: "AircraftPurchaseComponent",
      relationType: "implements",
      to: "JetNetApiStandards" 
    },
    {
      from: "AircraftPurchaseComponent",
      relationType: "follows",
      to: "ComponentStandards"
    }
  ]
});
```

---

*This document is dynamically enhanced through the Memory MCP tool - all guidelines are stored in the project's persistent knowledge graph for consistent reference.*

## Additional Resources

### Design Excellence
For visual design, typography, and data visualization principles, refer to **[DESIGN.md](./DESIGN.md)** - our comprehensive guide drawing from Swiss design masters, Japanese aesthetics, and information design pioneers like Edward Tufte, Ellen Lupton, and Nicholas Felton. This document provides essential guidance for creating interfaces that balance beauty with functionality.