# GitHub Actions CI/CD Setup Guide

This guide explains how to set up automated deployment to production using GitHub Actions.

## Overview

The CI/CD pipeline automatically deploys your application to EC2 when code is pushed to the `prod` branch.

## Workflow Features

- ✅ **Automatic deployment** on push to `prod` branch
- ✅ **Manual trigger** option via GitHub Actions UI
- ✅ **SSH-based deployment** to EC2 instance
- ✅ **Docker Compose integration** for container management
- ✅ **Database migrations** run automatically
- ✅ **Health checks** to verify deployment
- ✅ **Deployment logs** and status reporting

## Prerequisites

1. **EC2 instance** already deployed and running ✅ (Automated by `terraform apply`)
2. **SSH access** to EC2 instance ✅ (Automated by `terraform apply` if `github_actions_ssh_public_key` is set)
3. **GitHub repository** with `prod` branch ⚠️ (Manual - create branch in GitHub)
4. **GitHub Actions** enabled for your repository ✅ (Usually enabled by default)

> **Note**: If you set `github_actions_ssh_public_key` in `terraform.tfvars` before running `terraform apply`, the SSH access for GitHub Actions will be automatically configured. See `TERRAFORM_CI_CD_AUTOMATION.md` for details.

## Step 1: Generate SSH Key for GitHub Actions

You need a dedicated SSH key for GitHub Actions to access your EC2 instance.

### Option A: Use Existing EC2 Key Pair

If you already have an EC2 key pair:

```bash
# Your existing key (e.g., ~/.ssh/ec2-key.pem)
# Use this for GitHub Actions
```

### Option B: Create New SSH Key

```bash
# Generate a new SSH key for CI/CD
ssh-keygen -t ed25519 -C "github-actions@deploy" -f ~/.ssh/github-actions-deploy

# Or use RSA
ssh-keygen -t rsa -b 4096 -C "github-actions@deploy" -f ~/.ssh/github-actions-deploy
```

### Add Public Key to EC2 Instance

1. **Copy your public key**:
   ```bash
   cat ~/.ssh/github-actions-deploy.pub
   ```

2. **Add to EC2 instance**:
   ```bash
   # SSH into your EC2 instance
   ssh -i ~/.ssh/your-ec2-key.pem ec2-user@<ec2-ip>
   
   # Add the public key to authorized_keys
   echo "your-public-key-here" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

   Or add it to the EC2 instance during initial setup via user-data script.

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

### Required Secrets

1. **`EC2_HOST`**
   - **Value**: Your EC2 instance public IP or domain name
   - **Example**: `54.123.45.67` or `shop.jonnoyip.com`

2. **`EC2_SSH_PRIVATE_KEY`**
   - **Value**: Your SSH private key (the entire key including BEGIN/END lines)
   - **Example**:
     ```
     -----BEGIN OPENSSH PRIVATE KEY-----
     b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
     ...
     -----END OPENSSH PRIVATE KEY-----
     ```

### Optional Secrets (if needed)

3. **`EC2_USER`** (defaults to `ec2-user`)
   - **Value**: SSH username for EC2 instance
   - **Default**: `ec2-user`

4. **`APP_NAME`** (defaults to `portfolio-app`)
   - **Value**: Application name (must match your Terraform `app_name`)
   - **Default**: `portfolio-app`

## Step 3: Verify Workflow File

The workflow file is located at:
```
.github/workflows/deploy-prod.yml
```

Make sure it exists and is committed to your repository.

## Step 4: Test the Deployment

### Automatic Deployment

1. **Push to `prod` branch**:
   ```bash
   git checkout prod
   git merge main  # or your development branch
   git push origin prod
   ```

2. **Check GitHub Actions**:
   - Go to your repository on GitHub
   - Click **Actions** tab
   - You should see "Deploy to Production" workflow running
   - Click on it to see logs

### Manual Trigger

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select `prod` branch
5. Click **Run workflow**

## Workflow Steps Explained

### 1. Checkout Code
- Checks out the `prod` branch code

### 2. Configure SSH
- Sets up SSH key for EC2 access
- Adds EC2 host to known_hosts

### 3. Test SSH Connection
- Verifies SSH connection works before deployment

### 4. Deploy to EC2
- SSH into EC2 instance
- Pulls latest code from `prod` branch
- Stops existing containers
- Builds new Docker image
- Runs database migrations
- Starts new containers
- Verifies deployment

### 5. Health Check
- Checks if application is responding
- Tests HTTP endpoint

### 6. Deployment Summary
- Shows deployment status and details

## Customization

### Change Branch Name

Edit `.github/workflows/deploy-prod.yml`:

```yaml
on:
  push:
    branches:
      - production  # Change from 'prod' to 'production'
```

### Add Environment Variables

Add to workflow file:

```yaml
env:
  EC2_HOST: ${{ secrets.EC2_HOST }}
  CUSTOM_VAR: ${{ secrets.CUSTOM_VAR }}
```

### Add Pre-deployment Steps

Add steps before deployment:

```yaml
- name: Run tests
  run: |
    npm test
    
- name: Build check
  run: |
    npm run build
```

### Deploy to Multiple Environments

Create separate workflow files:

- `.github/workflows/deploy-staging.yml` (for `staging` branch)
- `.github/workflows/deploy-prod.yml` (for `prod` branch)

## Troubleshooting

### SSH Connection Fails

**Error**: `Permission denied (publickey)`

**Solutions**:
1. Verify SSH key is correct in GitHub Secrets
2. Check public key is in `~/.ssh/authorized_keys` on EC2
3. Verify EC2_HOST is correct
4. Check security group allows SSH from GitHub Actions IPs

### Deployment Fails

**Error**: `Container not running`

**Solutions**:
1. Check EC2 instance has enough resources (memory, disk)
2. View container logs: `sudo docker-compose logs`
3. Verify `.env.local` exists and has correct values
4. Check Docker is running: `sudo systemctl status docker`

### Health Check Fails

**Error**: `HTTP 000` or connection timeout

**Solutions**:
1. Application may still be starting (wait a few minutes)
2. Check security group allows port 3000
3. Verify Nginx is running: `sudo systemctl status nginx`
4. Check application logs: `sudo docker-compose logs`

### Git Pull Fails

**Error**: `fatal: could not read Username`

**Solutions**:
1. Ensure repository is accessible (public or deploy key configured)
2. If private repo, ensure SSH key has access
3. Check git remote URL is correct

## Security Best Practices

1. **Use Deploy Keys**: Create repository-specific deploy keys instead of personal SSH keys
2. **Rotate Keys**: Regularly rotate SSH keys
3. **Limit Access**: Restrict SSH access to specific IPs in security group (if possible)
4. **Use Secrets**: Never hardcode credentials in workflow files
5. **Review Logs**: Regularly review GitHub Actions logs for security issues

## Manual Deployment Script

You can also deploy manually using the provided script:

```bash
# On your local machine
ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip> 'bash -s' < scripts/deploy.sh

# Or on EC2 instance
cd /home/ec2-user/portfolio-app
bash scripts/deploy.sh
```

Make the script executable:

```bash
chmod +x scripts/deploy.sh
```

## Monitoring Deployments

### GitHub Actions Dashboard

- View all workflow runs: **Actions** tab
- See deployment history and status
- Download logs for debugging

### EC2 Instance

```bash
# SSH into instance
ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip>

# Check container status
sudo docker-compose ps

# View logs
sudo docker-compose logs -f

# Check deployment history
git log --oneline -10
```

## Rollback

If deployment fails or you need to rollback:

```bash
# SSH into EC2 instance
ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip>
cd /home/ec2-user/portfolio-app

# Checkout previous commit
git log --oneline -10  # Find the commit hash
git checkout <previous-commit-hash>

# Redeploy
sudo docker-compose down
sudo docker-compose build
sudo docker-compose up -d
```

Or use GitHub Actions to deploy a specific commit:

1. Go to **Actions** → **Deploy to Production**
2. Click **Run workflow**
3. Select branch and specific commit

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Support

If you encounter issues:

1. Check GitHub Actions logs for detailed error messages
2. Review EC2 instance logs: `sudo docker-compose logs`
3. Verify all secrets are correctly configured
4. Test SSH connection manually
5. Check EC2 instance resources and status

