# QA/QC Pipeline User Manual

**Application Quality Assurance & Quality Control**

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Available Commands](#available-commands)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Development Workflow](#development-workflow)
- [Configuration Files](#configuration-files)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## 🎯 Overview

This QA/QC pipeline ensures code quality, reliability, and maintainability for your application. It provides automated testing, linting, type checking, and continuous integration through GitHub Actions.

### Key Features
- **Automated Testing** with Jest (comprehensive test suites)
- **Code Linting** with ESLint (framework optimized)
- **Type Safety** with TypeScript
- **Pre-commit Hooks** for early issue detection
- **CI/CD Pipeline** with GitHub Actions
- **Security Scanning** and vulnerability detection
- **Code Coverage** reporting

---

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Run the QA setup script (one-time setup)
npm run qa:setup
```

This script will:
- Install Git pre-commit hooks
- Configure VS Code settings
- Set up the development environment

### 2. Daily Development
```bash
# Before committing code
npm run qa:check:basic

# Fix auto-fixable issues
npm run qa:fix

# Run full quality check
npm run qa:check:full
```

---

## ⚙️ Available Commands

### Core QA Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run qa:setup` | Initial QA environment setup | First time setup |
| `npm run qa:check:basic` | Quick quality check (lint + type + test) | Before commits |
| `npm run qa:check:full` | Complete quality check with strict mode | Before releases |
| `npm run qa:fix` | Auto-fix ESLint issues | To clean up code |
| `npm run qa:coverage` | Run tests with coverage report | To check test coverage |
| `npm run qa:audit` | Security vulnerability scan | Weekly/monthly |

### Individual Tools

| Command | Description | Output |
|---------|-------------|--------|
| `npm run lint` | Run ESLint checks | Shows linting warnings/errors |
| `npm run type-check` | TypeScript validation | Shows type errors |
| `npm test` | Run Jest tests | Test results |
| `npm run format` | Format code with Prettier | Automatically formats files |
| `npm run format:check` | Check if code is formatted | Shows formatting issues |

---

## 🔄 GitHub Actions Workflows

### Main QA/QC Pipeline (`.github/workflows/qa-qc.yml`)

**Triggers:**
- Push to `main`, `production`, `develop` branches
- Manual dispatch

**Jobs:**
1. **Quality Checks** - ESLint, TypeScript, Edge Runtime compatibility
2. **Testing** - Unit & integration tests with coverage
3. **Build Verification** - Ensures application builds successfully
4. **Security & Performance** - Audit scans and bundle analysis
5. **Edge Runtime Validation** - Vercel Edge compatibility checks
6. **Pre-deployment Validation** - Production readiness checks

### PR Quality Checks (`.github/workflows/pr-checks.yml`)

**Triggers:**
- Pull request opened/updated

**Features:**
- **Fast Feedback** - Quick quality checks on changed files
- **PR Complexity Analysis** - Warns about large PRs
- **Security Scanning** - Checks for secrets and sensitive files
- **Auto-reviewer Assignment** - Based on changed file areas

---

## 💻 Development Workflow

### Recommended Git Workflow

1. **Before Starting Work**
   ```bash
   git pull origin main
   npm install  # Ensure dependencies are up to date
   ```

2. **During Development**
   ```bash
   # Pre-commit hooks will run automatically on git commit
   # Manual check if needed:
   npm run qa:check:basic
   ```

3. **Before Creating PR**
   ```bash
   npm run qa:check:full
   npm run qa:coverage
   ```

4. **PR Review Process**
   - GitHub Actions will run automatically
   - Address any failing checks
   - Review PR complexity feedback

### Pre-commit Hooks

Automatically installed hooks that run on `git commit`:
- ✅ TypeScript type checking
- ✅ ESLint validation
- ✅ Edge Runtime compatibility check
- ❌ Blocks commit if critical issues found

---

## ⚙️ Configuration Files

### Core Configuration

| File | Purpose | Notes |
|------|---------|-------|
| `jest.config.cjs` | Jest testing configuration | Module path mappings, coverage settings |
| `.eslintrc.json` | ESLint rules | Framework optimized, warnings for gradual improvement |
| `tsconfig.json` | TypeScript configuration | Excludes problematic files, skipLibCheck enabled |
| `.prettierrc.js` | Code formatting rules | Consistent code style |

### QA Scripts Location
- `package-scripts/qa-setup.js` - Initial setup automation
- `.github/workflows/` - CI/CD pipeline definitions

### File Exclusions

The pipeline automatically excludes:
- `**/*.refactored.*` - Work-in-progress refactored files
- `**/temp-*` - Temporary files
- `backups/**/*` - Backup directories
- `node_modules/**/*` - Dependencies

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Pre-commit Hook Failures
```bash
# If pre-commit hooks fail, check what's wrong:
npm run qa:check:basic

# Fix issues and retry commit:
npm run qa:fix
git add .
git commit
```

#### 2. TypeScript Errors
```bash
# Check specific TypeScript errors:
npm run type-check

# For strict mode errors:
npm run type-check:strict
```

#### 3. Test Failures
```bash
# Run tests with verbose output:
npm test -- --verbose

# Run specific test file:
npm test -- path/to/test.test.ts

# Update snapshots if needed:
npm test -- --updateSnapshot
```

#### 4. GitHub Actions Failures
- Check the Actions tab in GitHub repository
- Look for specific job that failed
- Common fixes:
  - Update dependencies: `npm install`
  - Fix linting: `npm run qa:fix`
  - Address TypeScript errors: `npm run type-check`

### Performance Issues

#### Slow Test Runs
```bash
# Run tests without coverage for speed:
npm test -- --passWithNoTests

# Run only changed tests:
npm test -- --onlyChanged
```

#### Large Bundle Analysis
```bash
# Analyze bundle size:
npm run analyze
```

---

## 📋 Best Practices

### Code Quality

1. **Run QA checks before committing**
   ```bash
   npm run qa:check:basic
   ```

2. **Fix auto-fixable issues immediately**
   ```bash
   npm run qa:fix
   ```

3. **Write tests for new features**
   - Place tests in `__tests__` directories
   - Use descriptive test names
   - Aim for meaningful coverage, not just high percentages

### TypeScript Best Practices

1. **Gradual Type Safety**
   - Start with basic type checking
   - Enable strict mode per file/directory gradually
   - Add proper type definitions instead of using `any`

2. **Import Path Consistency**
   - Use `@/` alias for absolute imports
   - Follow existing patterns in the codebase

### Testing Best Practices

1. **Test Structure**
   ```typescript
   describe('Component/Function Name', () => {
     test('should do specific thing', () => {
       // Test implementation
     });
   });
   ```

2. **Mock External Dependencies**
   - Mock API calls
   - Mock complex external libraries
   - Use Jest mock functions

### PR Best Practices

1. **Keep PRs Small**
   - Under 500 lines of changes when possible
   - Single feature/fix per PR
   - Break large changes into smaller PRs

2. **Write Clear Descriptions**
   - Explain what changed and why
   - Include testing instructions
   - Reference relevant issues

---

## 📊 Current Status

### Test Coverage
- **Total Tests**: Comprehensive test suites
- **Passing**: High pass rate target (>80%)
- **Coverage Areas**: Hooks, services, utilities, components

### Code Quality Metrics
- **ESLint**: Continuous improvement with automated fixing
- **TypeScript**: Core syntax errors resolved
- **Security**: Regular dependency audits

### Continuous Improvement

The pipeline is designed for **gradual enhancement**:
- ✅ **Phase 1**: Basic functionality (COMPLETE)
- 🔄 **Phase 2**: Improve test coverage and fix failing tests
- 📈 **Phase 3**: Enable stricter TypeScript checking
- 🎯 **Phase 4**: Optimize performance and bundle size

---

## 🆘 Support

### Getting Help

1. **Check this manual first**
2. **Run diagnostics**: `npm run qa:check:basic`
3. **Check GitHub Actions logs** for CI/CD issues
4. **Review error messages** - they often contain solutions

### Useful Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Documentation](https://eslint.org/docs/user-guide/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Initial QA/QC pipeline implementation
- ✅ Jest testing framework setup
- ✅ ESLint with framework configuration
- ✅ TypeScript validation
- ✅ GitHub Actions CI/CD
- ✅ Pre-commit hooks
- ✅ Development scripts

---

*This user manual is maintained alongside the QA/QC pipeline. Please update it when making changes to the quality assurance processes.*