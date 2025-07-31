#!/bin/bash

# QA/QC Build Fix Script - Automated Import Resolution
# Systematically fixes all design system import issues

echo "🔧 JohnStreet Platform - Build Import Fix Script"
echo "================================================="

# Count of files to fix
total_fixes=0

# Define the import patterns to fix
declare -A import_fixes=(
    ["@/lib/design/TufteDesignSystem"]="@/lib/design"
    ["@/lib/design/DieterRamsDesignSystem"]="@/lib/design"
    ["@/lib/design/SwissTradingDesignSystem"]="@/lib/design"
    ["@/lib/design/DesignSystem"]="@/lib/design"
    ["@/lib/design/DesignSystemDark"]="@/lib/design"
    ["@/lib/design/AmbientDesignSystem"]="@/lib/design"
    ["@/lib/design/AmbientColorSystem"]="@/lib/design"
)

# Function to fix imports in a file
fix_imports_in_file() {
    local file="$1"
    local changed=false
    
    for old_import in "${!import_fixes[@]}"; do
        new_import="${import_fixes[$old_import]}"
        
        # Use sed to replace the import
        if sed -i.bak "s|from ['\"]${old_import}['\"]|from '${new_import}'|g" "$file" 2>/dev/null; then
            # Check if file was actually changed
            if ! cmp -s "$file" "${file}.bak"; then
                changed=true
            fi
            rm -f "${file}.bak"
        fi
    done
    
    if [ "$changed" = true ]; then
        echo "  ✓ Fixed: $(basename "$file")"
        return 0
    else
        return 1
    fi
}

# Find and fix TypeScript/React files
echo "📂 Scanning for files with import issues..."

file_count=0
fixed_count=0

# Find all .tsx and .ts files, excluding node_modules, .next, etc.
while IFS= read -r -d '' file; do
    ((file_count++))
    
    # Check if file contains problematic imports
    if grep -q "from ['\"]@/lib/design/.*DesignSystem" "$file" 2>/dev/null; then
        if fix_imports_in_file "$file"; then
            ((fixed_count++))
        fi
    fi
done < <(find . -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -not -path "./node_modules/*" \
    -not -path "./.next/*" \
    -not -path "./coverage/*" \
    -not -path "./.git/*" \
    -print0)

echo ""
echo "📊 Fix Summary:"
echo "   Files scanned: $file_count"
echo "   Files fixed: $fixed_count"

if [ $fixed_count -gt 0 ]; then
    echo ""
    echo "✅ Import fixes completed successfully!"
    echo ""
    echo "🧪 Next steps:"
    echo "   1. npm run dev    # Test development server"
    echo "   2. npm run build  # Test production build"
    echo "   3. npm run test   # Run test suite"
else
    echo ""
    echo "ℹ️  No import issues found or all already fixed."
fi

echo ""
echo "================================================="