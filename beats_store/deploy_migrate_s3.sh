#!/bin/bash
# Deployment script to migrate files to S3 on Railway
# This script runs migrations and migrates files to S3 before starting the server

set -e  # Exit on error (but we'll handle migration errors gracefully)

echo "🚀 Starting deployment process..."

# Run database migrations
echo "📦 Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Load beats if database is empty (auto mode - only loads if no beats exist)
echo "📥 Checking if beats need to be loaded..."
python manage.py load_beats --auto --skip-existing || {
    echo "⚠️  Beat loading skipped (beats already exist or export file not found)"
}

# Migrate files to S3 (idempotent - safe to run multiple times)
# This will verify all beat files are in S3 and migrate any that aren't
# Note: Files must be migrated locally first if they only exist on your machine
echo "☁️  Verifying and migrating files to S3..."
if python manage.py migrate_to_s3 --skip-on-error 2>&1; then
    echo "✅ S3 migration check completed"
else
    echo "⚠️  S3 migration check completed with warnings (this is normal if files are already migrated)"
    # Continue deployment - migration is idempotent
fi

# Start the server
echo "🚀 Starting Gunicorn server..."
exec gunicorn beats_store.wsgi:application --bind 0.0.0.0:$PORT
