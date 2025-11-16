# Docker Migration Summary

## What Changed

The deployment setup has been migrated from **PM2** to **Docker** for better containerization and deployment management.

## Files Created

1. **`Dockerfile`** - Multi-stage Docker build configuration
2. **`docker-compose.yml`** - Docker Compose configuration (optional, for easier local development)
3. **`.dockerignore`** - Files to exclude from Docker builds
4. **`DOCKER_DEPLOYMENT.md`** - Comprehensive Docker deployment guide

## Files Modified

1. **`terraform/user-data.sh`** - Updated to use Docker instead of PM2
2. **`next.config.js`** - Added `output: 'standalone'` for optimized Docker builds
3. **`EC2_DEPLOYMENT_QUICKSTART.md`** - Updated commands to use Docker

## Key Changes in user-data.sh

### Before (PM2):
- Installed Node.js and PM2
- Ran `npm install` and `npm run build` on host
- Used PM2 to manage the process
- Created `ecosystem.config.js`

### After (Docker):
- Installs Docker and Docker Compose
- Builds Docker image (handles dependencies and build inside container)
- Runs container with `--restart unless-stopped`
- Environment variables loaded from `.env.local` via `--env-file`

## Benefits of Docker

1. **Isolation**: Application runs in isolated container
2. **Consistency**: Same environment across dev/staging/production
3. **Dependencies**: All dependencies bundled in image
4. **Easy Rollback**: Switch between image versions easily
5. **Scaling**: Easy to run multiple containers
6. **Security**: Runs as non-root user

## Deployment Process

### Automatic (via Terraform):
1. EC2 instance boots
2. `user-data.sh` runs automatically
3. Docker installed
4. Code cloned/uploaded
5. Docker image built
6. Database migrations run
7. Container started
8. Nginx configured
9. SSL certificate obtained

### Manual Commands:

**View logs:**
```bash
sudo docker logs portfolio-app
```

**Restart:**
```bash
sudo docker restart portfolio-app
```

**Update:**
```bash
cd /home/ec2-user/portfolio-app
git pull
sudo docker build -t portfolio-app:latest .
sudo docker stop portfolio-app && sudo docker rm portfolio-app
sudo docker run -d --name portfolio-app --restart unless-stopped -p 3000:3000 --env-file .env.local -e NODE_ENV=production -e PORT=3000 portfolio-app:latest
```

## Migration Notes

- **No breaking changes** to application code
- **Environment variables** still use `.env.local` file
- **Nginx configuration** unchanged (still proxies to port 3000)
- **SSL setup** unchanged (still uses Let's Encrypt)
- **Database migrations** now run in temporary Docker container

## Next Steps

1. Test the Docker build locally:
   ```bash
   docker build -t portfolio-app:latest .
   docker run -p 3000:3000 --env-file .env.local portfolio-app:latest
   ```

2. Deploy to EC2 using Terraform (same process as before)

3. Monitor container:
   ```bash
   sudo docker ps
   sudo docker logs portfolio-app
   ```

## Documentation

- **Full Docker Guide**: See `DOCKER_DEPLOYMENT.md`
- **EC2 Deployment**: See `EC2_DEPLOYMENT_GUIDE.md`
- **Quick Start**: See `EC2_DEPLOYMENT_QUICKSTART.md`

