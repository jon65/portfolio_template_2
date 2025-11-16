# Docker Deployment Guide

This guide explains how the Docker-based deployment works for the Next.js application on EC2.

## Overview

The application is now containerized using Docker instead of PM2. This provides:
- ✅ Consistent environments across dev/staging/production
- ✅ Easy dependency management
- ✅ Better isolation and security
- ✅ Simplified deployment and rollbacks
- ✅ Easier scaling

## Docker Architecture

### Multi-Stage Build

The `Dockerfile` uses a 3-stage build process:

1. **Dependencies Stage** (`deps`): Installs npm dependencies
2. **Builder Stage** (`builder`): Builds the Next.js application
3. **Runner Stage** (`runner`): Creates the final lightweight production image

### Standalone Output

Next.js is configured with `output: 'standalone'` in `next.config.js`, which creates a minimal production build that includes only the necessary files.

## Files Structure

```
.
├── Dockerfile              # Multi-stage Docker build configuration
├── docker-compose.yml      # Docker Compose configuration (optional)
├── .dockerignore          # Files to exclude from Docker build
└── terraform/
    └── user-data.sh       # EC2 setup script (uses Docker)
```

## How It Works

### 1. Build Process

When `user-data.sh` runs on EC2:

```bash
# Build the Docker image
sudo docker build -t portfolio-app:latest .

# The build process:
# 1. Installs dependencies (deps stage)
# 2. Generates Prisma Client
# 3. Builds Next.js app (builder stage)
# 4. Creates minimal production image (runner stage)
```

### 2. Database Migrations

Migrations run in a temporary container before starting the app:

```bash
sudo docker run --rm \
    --env-file .env.local \
    portfolio-app:latest \
    sh -c "cd /app && npx prisma db push --accept-data-loss"
```

### 3. Container Startup

The application runs in a Docker container:

```bash
sudo docker run -d \
    --name portfolio-app \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env.local \
    -e NODE_ENV=production \
    -e PORT=3000 \
    portfolio-app:latest
```

### 4. Nginx Reverse Proxy

Nginx forwards requests to the Docker container:

```nginx
upstream nextjs {
    server 127.0.0.1:3000;
    keepalive 64;
}
```

## Managing the Container

### View Container Status

```bash
# Check if container is running
sudo docker ps

# View container logs
sudo docker logs portfolio-app

# Follow logs in real-time
sudo docker logs -f portfolio-app
```

### Restart Container

```bash
sudo docker restart portfolio-app
```

### Stop Container

```bash
sudo docker stop portfolio-app
```

### Start Container

```bash
sudo docker start portfolio-app
```

### Remove Container

```bash
sudo docker stop portfolio-app
sudo docker rm portfolio-app
```

## Updating the Application

### Option 1: Rebuild and Restart (Recommended)

```bash
cd /home/ec2-user/portfolio-app

# Pull latest code (if using Git)
git pull

# Rebuild the Docker image
sudo docker build -t portfolio-app:latest .

# Stop and remove old container
sudo docker stop portfolio-app
sudo docker rm portfolio-app

# Run migrations (if needed)
sudo docker run --rm \
    --env-file .env.local \
    portfolio-app:latest \
    sh -c "cd /app && npx prisma db push --accept-data-loss"

# Start new container
sudo docker run -d \
    --name portfolio-app \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env.local \
    -e NODE_ENV=production \
    -e PORT=3000 \
    portfolio-app:latest
```

### Option 2: Using Docker Compose (If configured)

```bash
cd /home/ec2-user/portfolio-app

# Pull latest code
git pull

# Rebuild and restart
sudo docker-compose up -d --build
```

## Environment Variables

Environment variables are loaded from `.env.local`:

```bash
# The container uses --env-file flag
sudo docker run ... --env-file .env.local ...
```

To update environment variables:

1. Edit `.env.local` on the EC2 instance
2. Restart the container:
   ```bash
   sudo docker restart portfolio-app
   ```

## Database Migrations

### Run Migrations Manually

```bash
sudo docker run --rm \
    --env-file /home/ec2-user/portfolio-app/.env.local \
    portfolio-app:latest \
    sh -c "cd /app && npx prisma db push"
```

### Run Prisma Studio (for debugging)

```bash
sudo docker run -it --rm \
    -p 5555:5555 \
    --env-file /home/ec2-user/portfolio-app/.env.local \
    portfolio-app:latest \
    sh -c "cd /app && npx prisma studio --hostname 0.0.0.0"
```

Then access at `http://<ec2-ip>:5555`

## Troubleshooting

### Container Won't Start

1. **Check logs**:
   ```bash
   sudo docker logs portfolio-app
   ```

2. **Check if port is already in use**:
   ```bash
   sudo netstat -tulpn | grep 3000
   ```

3. **Check environment variables**:
   ```bash
   sudo docker run --rm --env-file .env.local portfolio-app:latest env
   ```

### Application Not Responding

1. **Check container status**:
   ```bash
   sudo docker ps -a
   ```

2. **Check container logs**:
   ```bash
   sudo docker logs portfolio-app
   ```

3. **Test container directly**:
   ```bash
   curl http://localhost:3000
   ```

4. **Check Nginx**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

### Build Fails

1. **Check Docker build logs**:
   ```bash
   sudo docker build -t portfolio-app:latest . 2>&1 | tee build.log
   ```

2. **Check disk space**:
   ```bash
   df -h
   sudo docker system df
   ```

3. **Clean up Docker**:
   ```bash
   sudo docker system prune -a
   ```

### Out of Memory

If the container is using too much memory:

1. **Check memory usage**:
   ```bash
   sudo docker stats portfolio-app
   ```

2. **Set memory limit** (in user-data.sh or docker run):
   ```bash
   sudo docker run -d \
       --memory="512m" \
       --memory-swap="1g" \
       ...
   ```

## Local Development with Docker

### Build Locally

```bash
docker build -t portfolio-app:latest .
```

### Run Locally

```bash
docker run -p 3000:3000 \
    --env-file .env.local \
    portfolio-app:latest
```

### Using Docker Compose

```bash
docker-compose up -d
```

## Security Considerations

1. **Non-root user**: Container runs as `nextjs` user (not root)
2. **Minimal image**: Uses Alpine Linux for smaller attack surface
3. **Environment variables**: Sensitive data in `.env.local` (not in image)
4. **Restart policy**: `unless-stopped` ensures container restarts on failure

## Performance Tips

1. **Use Docker layer caching**: Structure Dockerfile to cache dependencies
2. **Multi-stage builds**: Reduces final image size
3. **Standalone output**: Next.js standalone mode reduces image size
4. **Keepalive connections**: Nginx configured with `keepalive 64`

## Comparison: Docker vs PM2

| Feature | Docker | PM2 |
|---------|--------|-----|
| Isolation | ✅ Full container isolation | ❌ Process-level only |
| Consistency | ✅ Same environment everywhere | ⚠️ Depends on host OS |
| Dependencies | ✅ Bundled in image | ❌ Installed on host |
| Rollback | ✅ Easy (different image tag) | ⚠️ Requires code revert |
| Scaling | ✅ Easy (multiple containers) | ⚠️ More complex |
| Resource limits | ✅ Built-in (cgroups) | ⚠️ Requires manual config |

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

