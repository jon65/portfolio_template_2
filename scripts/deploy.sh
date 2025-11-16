#!/bin/bash
# Deployment script for EC2 instance
# This script can be run manually or via CI/CD

set -e

APP_NAME="${APP_NAME:-portfolio-app}"
APP_DIR="/home/ec2-user/${APP_NAME}"

echo "=== Starting deployment ==="
echo "App Name: $APP_NAME"
echo "App Directory: $APP_DIR"
echo "Current directory: $(pwd)"
echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
echo ""

# Navigate to app directory
cd "$APP_DIR" || {
  echo "Error: App directory $APP_DIR not found!"
  exit 1
}

# Pull latest code (if in a git repository)
if [ -d ".git" ]; then
  echo "=== Pulling latest code ==="
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "master")
  echo "Current branch: $CURRENT_BRANCH"
  
  # Fetch and reset to latest
  git fetch origin "$CURRENT_BRANCH" || git fetch origin
  git reset --hard "origin/$CURRENT_BRANCH" || git reset --hard HEAD
  git clean -fd
  echo "✅ Code updated"
  echo ""
fi

# Verify docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found in $APP_DIR"
  exit 1
fi

# Set APP_NAME for docker-compose
export APP_NAME

# Stop existing containers
echo "=== Stopping existing containers ==="
sudo docker-compose down || true
echo "✅ Containers stopped"
echo ""

# Build new image
echo "=== Building Docker image ==="
sudo docker-compose build --no-cache
echo "✅ Image built"
echo ""

# Run database migrations
if [ -f "prisma/schema.prisma" ]; then
  echo "=== Running database migrations ==="
  sudo docker-compose run --rm app \
    sh -c "npx prisma db push --accept-data-loss" || {
    echo "⚠️ Migration failed or skipped"
  }
  echo ""
fi

# Start containers
echo "=== Starting containers ==="
sudo docker-compose up -d
echo "✅ Containers started"
echo ""

# Wait for container to be ready
echo "=== Waiting for container to start ==="
sleep 15

# Verify container is running
echo "=== Verifying deployment ==="
if sudo docker-compose ps | grep -q "Up"; then
  echo "✅ Deployment successful!"
  echo ""
  sudo docker-compose ps
  echo ""
else
  echo "❌ Deployment failed - container not running"
  echo ""
  echo "=== Container logs ==="
  sudo docker-compose logs
  exit 1
fi

# Show container logs
echo "=== Container logs (last 20 lines) ==="
sudo docker-compose logs --tail=20

echo ""
echo "=== Deployment completed successfully ==="

