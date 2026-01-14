#!/bin/bash

# Deployment script for Django backend
# Usage: ./deploy.sh [railway|heroku]

set -e

PLATFORM=${1:-railway}

echo "🚀 Starting deployment to $PLATFORM..."

if [ "$PLATFORM" = "railway" ]; then
    echo "📦 Deploying to Railway..."
    echo "✅ Railway auto-deploys on git push"
    echo "📝 Make sure to:"
    echo "   1. Set environment variables in Railway dashboard"
    echo "   2. Run migrations: railway run python manage.py migrate"
    echo "   3. Create superuser: railway run python manage.py createsuperuser"
    
elif [ "$PLATFORM" = "heroku" ]; then
    echo "📦 Deploying to Heroku..."
    
    # Check if heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        echo "❌ Heroku CLI not found. Install it first:"
        echo "   brew install heroku/brew/heroku"
        exit 1
    fi
    
    # Check if logged in
    if ! heroku auth:whoami &> /dev/null; then
        echo "🔐 Please login to Heroku first:"
        echo "   heroku login"
        exit 1
    fi
    
    echo "📤 Pushing to Heroku..."
    git subtree push --prefix beats_store heroku main
    
    echo "🔄 Running migrations..."
    heroku run python manage.py migrate
    
    echo "✅ Deployment complete!"
    echo "📝 Don't forget to:"
    echo "   1. Set environment variables: heroku config:set KEY=value"
    echo "   2. Create superuser: heroku run python manage.py createsuperuser"
    
else
    echo "❌ Unknown platform: $PLATFORM"
    echo "Usage: ./deploy.sh [railway|heroku]"
    exit 1
fi
