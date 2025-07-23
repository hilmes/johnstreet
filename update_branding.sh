#!/bin/bash

# Update all occurrences of algodash to johnstreet
echo "Updating branding from algodash to johnstreet..."

# Case-sensitive replacements
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.py" -o -name "*.md" -o -name "*.html" -o -name "*.env*" \) -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" -exec sed -i '' 's/algodash/johnstreet/g' {} \;

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.py" -o -name "*.md" -o -name "*.html" -o -name "*.env*" \) -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" -exec sed -i '' 's/AlgoDash/JohnStreet/g' {} \;

find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.py" -o -name "*.md" -o -name "*.html" -o -name "*.env*" \) -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" -exec sed -i '' 's/ALGODASH/JOHNSTREET/g' {} \;

echo "Branding update complete!"