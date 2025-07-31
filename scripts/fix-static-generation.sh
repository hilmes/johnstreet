#!/bin/bash

# Script to add dynamic configuration to all pages that are failing static generation

echo "Fixing static generation issues for all pages..."

# List of pages that need dynamic configuration
pages=(
  "app/activity-feed/page.tsx"
  "app/ai-strategy/page.tsx"
  "app/analysis/performance/page.tsx"
  "app/analytics/market/page.tsx"
  "app/analytics/portfolio/page.tsx"
  "app/control-center/page.tsx"
  "app/execution/page.tsx"
  "app/financial-excellence/page.tsx"
  "app/intelligence/page.tsx"
  "app/portfolio/page.tsx"
  "app/risk-console/page.tsx"
  "app/risk/alerts/page.tsx"
  "app/risk/dashboard/page.tsx"
  "app/risk/pump-detector/page.tsx"
  "app/sentiment/page.tsx"
  "app/settings/page.tsx"
  "app/strategies/backtest/page.tsx"
  "app/strategies/page.tsx"
  "app/strategies/performance/page.tsx"
  "app/strategy-lab/page.tsx"
  "app/trading/live/page.tsx"
  "app/trading/orders/page.tsx"
  "app/trading/page.tsx"
  "app/trading/paper/page.tsx"
)

for page in "${pages[@]}"; do
  if [ -f "$page" ]; then
    # Check if the file already has dynamic export
    if ! grep -q "export const dynamic" "$page"; then
      echo "Adding dynamic configuration to $page"
      
      # Add dynamic export after 'use client' if it exists, or at the beginning
      if grep -q "'use client'" "$page"; then
        sed -i '' "/'use client'/a\\
\\
export const dynamic = 'force-dynamic'
" "$page"
      else
        # Add at the beginning of the file
        echo -e "export const dynamic = 'force-dynamic'\n\n$(cat $page)" > "$page"
      fi
    else
      echo "Skipping $page - already has dynamic configuration"
    fi
  else
    echo "Warning: $page not found"
  fi
done

echo "Done! All pages now have dynamic configuration to prevent static generation issues."