# User-Data Script Summary

## Overview

The `user-data.sh` script runs automatically when an EC2 instance is created. It sets up the entire deployment environment including Docker, GitHub SSH access, and docker-compose.

## What the Script Does

### 1. System Updates & Docker Installation
- Updates system packages
- Installs Docker
- Installs Docker Compose
- Installs Git and SSH client
- Configures Docker to start on boot

### 2. GitHub SSH Setup (for Private Repos)
- Creates `.ssh` directory for ec2-user
- Writes SSH private key from Terraform variable
- Adds GitHub to known_hosts
- Converts HTTPS GitHub URLs to SSH URLs automatically
- Clones private repository using SSH

### 3. Environment Configuration
- Creates `.env.local` file with all environment variables
- Sets proper file permissions (600)
- Configures ownership for ec2-user

### 4. Docker Compose Build & Run
- Builds Docker image using `docker-compose build`
- Runs Prisma database migrations
- Starts application using `docker-compose up -d`
- Verifies container is running

### 5. Nginx & SSL Setup
- Installs Nginx reverse proxy
- Installs Certbot for SSL certificates
- Configures Nginx to proxy to Docker container (port 3000)
- Automatically obtains SSL certificate from Let's Encrypt
- Configures HTTP to HTTPS redirect

## Key Features

### SSH Key Handling
- Supports private GitHub repositories
- Automatically converts HTTPS URLs to SSH
- Secure key storage with proper permissions
- Works with both standard GitHub and GitHub Enterprise

### Docker Compose Integration
- Uses `docker-compose.yml` for container management
- Falls back to direct Docker commands if compose file not found
- Handles environment variables via `.env.local`
- Automatic container restart on failure

### Error Handling
- Continues on non-critical failures (migrations, SSL)
- Logs all operations
- Verifies container startup
- Provides helpful error messages

## Configuration Requirements

### Required Terraform Variables

```hcl
# GitHub Configuration
github_repo_url = "https://github.com/username/repo.git"  # or SSH URL
github_branch = "master"
github_ssh_private_key = "-----BEGIN OPENSSH PRIVATE KEY-----..."  # For private repos

# Application Configuration
app_name = "portfolio-app"
domain_name = "shop.jonnoyip.com"
admin_email = "admin@shop.jonnoyip.com"

# Environment Variables (all your app config)
database_url = "..."
stripe_publishable_key = "..."
# ... etc
```

## Execution Flow

```
1. System Update
   ↓
2. Install Docker & Docker Compose
   ↓
3. Set up SSH for GitHub (if private repo)
   ↓
4. Clone Repository
   ↓
5. Create .env.local
   ↓
6. Build Docker Image (docker-compose build)
   ↓
7. Run Database Migrations
   ↓
8. Start Container (docker-compose up -d)
   ↓
9. Install & Configure Nginx
   ↓
10. Obtain SSL Certificate
    ↓
11. Complete!
```

## Logs & Debugging

### View Execution Logs
```bash
# SSH into instance
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>

# View full user-data execution log
sudo cat /var/log/cloud-init-output.log

# View custom completion log
cat /var/log/user-data.log

# View Docker container logs
sudo docker-compose logs
sudo docker-compose logs -f  # Follow logs
```

### Common Issues

**SSH Key Not Working:**
- Check key format (must include BEGIN/END lines)
- Verify key is added to GitHub
- Check permissions: `ls -la ~/.ssh/`

**Docker Build Fails:**
- Check disk space: `df -h`
- View build logs: `sudo docker-compose build`
- Verify Dockerfile exists

**Container Not Starting:**
- Check logs: `sudo docker-compose logs`
- Verify .env.local exists and has correct values
- Check port 3000 is available: `sudo netstat -tulpn | grep 3000`

**SSL Certificate Fails:**
- Verify DNS points to EC2 IP
- Check port 80 is accessible
- Manually run: `sudo certbot --nginx -d shop.jonnoyip.com`

## Security Considerations

1. **SSH Keys**: Stored securely with 600 permissions
2. **Environment Variables**: Protected with 600 permissions
3. **Non-root User**: Docker runs as ec2-user where possible
4. **Firewall**: Configured to allow only necessary ports
5. **SSL**: Automatic HTTPS with Let's Encrypt

## Customization

To modify the deployment process:

1. Edit `terraform/user-data.sh`
2. Add your custom commands
3. Use Terraform variables with `${variable_name}` syntax
4. Run `terraform apply` to update

**Note**: User-data only runs on first boot. To re-run, create a new instance or manually execute commands via SSH.

