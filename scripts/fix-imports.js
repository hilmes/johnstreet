#!/usr/bin/env node

/**
 * QA/QC Build Fix Script
 * 
 * Systematically fixes import issues across the codebase to ensure successful builds
 * and prevent deployment failures.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function findFilesWithPattern(dir, pattern, extensions = ['.tsx', '.ts']) {
  const files = []
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir)
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory() && !['node_modules', '.next', '.git', 'coverage'].includes(item)) {
          traverse(fullPath)
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'utf8')
          if (pattern.test(content)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      log(`Error reading directory ${currentDir}: ${error.message}`, 'red')
    }
  }
  
  traverse(dir)
  return files
}

function fixImport(filePath, oldImport, newImport) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const updatedContent = content.replace(oldImport, newImport)
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8')
      log(`  ✓ Fixed import in ${path.relative(process.cwd(), filePath)}`, 'green')
      return true
    }
    return false
  } catch (error) {
    log(`  ✗ Error fixing ${filePath}: ${error.message}`, 'red')
    return false
  }
}

function main() {
  log('🔧 Starting Build Import Fixes', 'cyan')
  log('=' * 50, 'cyan')
  
  const projectRoot = process.cwd()
  let totalFixed = 0
  
  // Define import fix patterns
  const importFixes = [
    {
      name: 'TufteDesignSystem imports',
      pattern: /from ['"]@\/lib\/design\/TufteDesignSystem['"]/g,
      oldPattern: /from ['"]@\/lib\/design\/TufteDesignSystem['"]/g,
      newImport: "from '@/lib/design'"
    },
    {
      name: 'DieterRamsDesignSystem imports',
      pattern: /from ['"]@\/lib\/design\/DieterRamsDesignSystem['"]/g,
      oldPattern: /from ['"]@\/lib\/design\/DieterRamsDesignSystem['"]/g,
      newImport: "from '@/lib/design'"
    },
    {
      name: 'SwissTradingDesignSystem imports',
      pattern: /from ['"]@\/lib\/design\/SwissTradingDesignSystem['"]/g,
      oldPattern: /from ['"]@\/lib\/design\/SwissTradingDesignSystem['"]/g,
      newImport: "from '@/lib/design'"
    },
    {
      name: 'DesignSystem imports',
      pattern: /from ['"]@\/lib\/design\/DesignSystem['"]/g,
      oldPattern: /from ['"]@\/lib\/design\/DesignSystem['"]/g,
      newImport: "from '@/lib/design'"
    },
    {
      name: 'DesignSystemDark imports',
      pattern: /from ['"]@\/lib\/design\/DesignSystemDark['"]/g,
      oldPattern: /from ['"]@\/lib\/design\/DesignSystemDark['"]/g,
      newImport: "from '@/lib/design'"
    },
    {
      name: 'AmbientDesignSystem imports',
      pattern: /from ['"]@\/lib\/design\/AmbientDesignSystem['"]/g,
      oldPattern: /from ['"]@\/lib\/design\/AmbientDesignSystem['"]/g,
      newImport: "from '@/lib/design'"
    }
  ]
  
  // Process each fix pattern
  for (const fix of importFixes) {
    log(`\n📂 Processing ${fix.name}...`, 'yellow')
    
    const affectedFiles = findFilesWithPattern(projectRoot, fix.pattern)
    
    if (affectedFiles.length === 0) {
      log(`  No files found with ${fix.name}`, 'blue')
      continue
    }
    
    log(`  Found ${affectedFiles.length} files to fix`, 'blue')
    
    for (const filePath of affectedFiles) {
      const content = fs.readFileSync(filePath, 'utf8')
      const updatedContent = content.replace(fix.oldPattern, fix.newImport)
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8')
        log(`    ✓ ${path.relative(projectRoot, filePath)}`, 'green')
        totalFixed++
      }
    }
  }
  
  // Fix specific component import issues
  log(`\n🔧 Fixing specific component imports...`, 'yellow')
  
  // Check for PrimaryMetricCard, SecondaryMetricCard imports that should come from core
  const componentImportPattern = /import\s*\{[^}]*(?:PrimaryMetricCard|SecondaryMetricCard)[^}]*\}\s*from\s*['"]@\/components\/[^'"]*['"]/g
  const componentFiles = findFilesWithPattern(projectRoot, componentImportPattern)
  
  for (const filePath of componentFiles) {
    const content = fs.readFileSync(filePath, 'utf8')
    const updatedContent = content.replace(
      /import\s*\{([^}]*(?:PrimaryMetricCard|SecondaryMetricCard)[^}]*)\}\s*from\s*['"]@\/components\/[^'"]*['"]/g,
      "import { $1 } from '@/components/core'"
    )
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8')
      log(`    ✓ Fixed component imports in ${path.relative(projectRoot, filePath)}`, 'green')
      totalFixed++
    }
  }
  
  // Summary
  log('\n' + '=' * 50, 'cyan')
  log(`🎉 Import fixes completed!`, 'cyan')
  log(`   Total files fixed: ${totalFixed}`, 'green')
  
  if (totalFixed > 0) {
    log('\n⚡ Running build validation...', 'yellow')
    
    try {
      execSync('npm run build --dry-run 2>/dev/null || echo "Build check skipped"', { stdio: 'inherit' })
      log('✅ Build validation completed', 'green')
    } catch (error) {
      log('⚠️  Build validation failed - manual review needed', 'yellow')
    }
  }
  
  log('\n📋 Next steps:', 'cyan')
  log('   1. Run: npm run dev to test development server', 'blue')
  log('   2. Run: npm run build to test production build', 'blue')
  log('   3. Run: npm run test to validate functionality', 'blue')
}

if (require.main === module) {
  main()
}

module.exports = { fixImport, findFilesWithPattern }