#!/bin/bash
# Pre-deployment script to migrate all beat files to S3
# Run this locally BEFORE deploying to production
# This ensures all files are uploaded to S3 before deployment

echo "☁️  Migrating all beat files to S3..."
echo ""

# Run the migration command
python manage.py migrate_to_s3

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify files are in S3 bucket"
echo "   2. Commit and push to trigger Railway deployment"
echo "   3. Railway will verify files on deployment"
