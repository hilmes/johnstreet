#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Add Edge Runtime configuration to all API routes
 * As per AI-GUIDELINES.md: "Edge Runtime for Vercel should be configured properly for all API routes"
 */

const API_ROUTES_PATTERN = 'app/api/**/route.ts';
const EDGE_RUNTIME_EXPORT = 'export const runtime = \'edge\'';

function addEdgeRuntimeToFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has edge runtime configuration
    if (content.includes('export const runtime')) {
      console.log(`✓ ${filePath} already has runtime configuration`);
      return;
    }
    
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex === -1) {
      // No imports found, add at the beginning
      const newContent = `${EDGE_RUNTIME_EXPORT}\n\n${content}`;
      fs.writeFileSync(filePath, newContent);
    } else {
      // Insert after the last import
      lines.splice(lastImportIndex + 1, 0, '', EDGE_RUNTIME_EXPORT);
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent);
    }
    
    console.log(`✓ Added Edge Runtime to ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Adding Edge Runtime configuration to API routes...\n');
  
  const apiRoutes = glob.sync(API_ROUTES_PATTERN);
  
  if (apiRoutes.length === 0) {
    console.log('No API route files found');
    return;
  }
  
  console.log(`Found ${apiRoutes.length} API route files:\n`);
  
  apiRoutes.forEach(filePath => {
    addEdgeRuntimeToFile(filePath);
  });
  
  console.log(`\n✅ Edge Runtime configuration complete!`);
  console.log(`📝 Updated ${apiRoutes.length} API route files`);
}

if (require.main === module) {
  main();
}

module.exports = { addEdgeRuntimeToFile };