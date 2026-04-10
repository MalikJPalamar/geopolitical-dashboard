#!/bin/bash
# Quick deployment script for centaurion.me/geopolitical-lens
# Usage: ./deploy.sh [platform]
# Platforms: vps, docker, cloudflare, vercel, netlify

set -e

PLATFORM="${1:-vps}"
PROJECT_NAME="geopolitical-lens"
BASE_PATH="/geopolitical-lens"

echo "🚀 Deploying Geopolitical Intelligence Dashboard"
echo "📍 Target: centaurion.me/geopolitical-lens"
echo "🔧 Platform: $PLATFORM"
echo ""

# Check for required files
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your ANTHROPIC_API_KEY"
    echo "   Then run this script again."
    exit 1
fi

# Check for ANTHROPIC_API_KEY
source .env
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-..." ]; then
    echo "❌ ANTHROPIC_API_KEY not set in .env"
    echo "   Get your key from: https://console.anthropic.com/"
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Build the application
echo "📦 Building application..."
NODE_ENV=production npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build complete"
echo ""

case $PLATFORM in
    vps)
        echo "🖥️  VPS Deployment"
        echo ""
        echo "Next steps:"
        echo "1. Copy files to your server:"
        echo "   rsync -avz --exclude node_modules --exclude .git ./ user@centaurion.me:/var/www/$PROJECT_NAME/"
        echo ""
        echo "2. SSH into your server and run:"
        echo "   cd /var/www/$PROJECT_NAME"
        echo "   npm ci --production"
        echo "   npm run start:prod"
        echo ""
        echo "3. Configure Nginx using nginx.conf.example"
        echo "4. Set up SSL with Let's Encrypt:"
        echo "   sudo certbot --nginx -d centaurion.me"
        echo ""
        echo "📄 See DEPLOYMENT.md for detailed instructions"
        ;;
        
    docker)
        echo "🐳 Docker Deployment"
        echo ""
        echo "Building Docker image..."
        docker build -t $PROJECT_NAME .
        
        if [ $? -ne 0 ]; then
            echo "❌ Docker build failed"
            exit 1
        fi
        
        echo "✅ Docker image built"
        echo ""
        echo "Starting container with docker-compose..."
        docker-compose up -d
        
        echo ""
        echo "✅ Container started"
        echo "📊 Check status: docker-compose ps"
        echo "📋 View logs: docker-compose logs -f"
        echo "🏥 Health check: curl http://localhost:3001/api/health"
        ;;
        
    cloudflare)
        echo "☁️  Cloudflare Pages Deployment"
        echo ""
        
        if ! command -v wrangler &> /dev/null; then
            echo "Installing Wrangler CLI..."
            npm install -g wrangler
        fi
        
        echo "Deploying to Cloudflare Pages..."
        wrangler pages deploy dist --project-name=$PROJECT_NAME
        
        echo ""
        echo "✅ Deployed to Cloudflare"
        echo "⚙️  Don't forget to set environment variables in Cloudflare dashboard:"
        echo "   - ANTHROPIC_API_KEY"
        echo "   - NODE_ENV=production"
        echo "   - BASE_PATH=/geopolitical-lens"
        ;;
        
    vercel)
        echo "🔺 Vercel Deployment"
        echo ""
        
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "Deploying to Vercel..."
        vercel --prod
        
        echo ""
        echo "✅ Deployed to Vercel"
        echo "⚙️  Set environment variable in Vercel dashboard:"
        echo "   ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
        ;;
        
    netlify)
        echo "🟢 Netlify Deployment"
        echo ""
        
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "Deploying to Netlify..."
        netlify deploy --prod
        
        echo ""
        echo "✅ Deployed to Netlify"
        echo "⚙️  Set environment variable in Netlify dashboard:"
        echo "   ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
        ;;
        
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "Usage: ./deploy.sh [vps|docker|cloudflare|vercel|netlify]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment preparation complete!"
echo "🌐 Access at: https://centaurion.me/geopolitical-lens"
echo "📚 Full guide: DEPLOYMENT.md"
