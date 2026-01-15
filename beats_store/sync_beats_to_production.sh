#!/bin/bash
# Script to sync all beats from local to production
# This exports beats, migrates files to S3, and provides instructions for production import

set -e

echo "🔄 Syncing beats to production..."
echo ""

# Step 1: Export beats
echo "📤 Step 1: Exporting beats from local database..."
python manage.py export_beats --output beats_export.json

if [ ! -f "beats_export.json" ]; then
    echo "❌ Failed to export beats"
    exit 1
fi

echo "✅ Beats exported to beats_export.json"
echo ""

# Step 2: Migrate files to S3
echo "☁️  Step 2: Migrating files to S3..."
python manage.py migrate_to_s3

echo ""
echo "✅ Files migrated to S3"
echo ""

# Step 3: Instructions
echo "📝 Next steps:"
echo ""
echo "1. Commit beats_export.json to git (so it's available in production):"
echo "   git add beats_export.json"
echo "   git commit -m 'Add beats export for production deployment'"
echo ""
echo "2. Push to trigger Railway deployment"
echo ""
echo "3. Railway will automatically:"
echo "   - Load beats if database is empty (from beats_export.json)"
echo "   - Verify files are in S3"
echo ""
echo "✅ Local sync complete! Files are in S3 and ready for production."
