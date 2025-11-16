# CI/CD Quick Start Guide

Quick reference for setting up and using the GitHub Actions CI/CD pipeline.

## Quick Setup (5 minutes)

### 1. Add GitHub Secrets

Go to: **Repository Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` or `shop.jonnoyip.com` |
| `EC2_SSH_PRIVATE_KEY` | SSH private key (full key) | `-----BEGIN OPENSSH...` |

### 2. Add SSH Key to EC2

```bash
# On your local machine, copy public key
cat ~/.ssh/your-ssh-key.pub

# SSH into EC2 and add it
ssh -i ~/.ssh/your-ec2-key.pem ec2-user@<ec2-ip>
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Push to Prod Branch

```bash
git checkout prod
git merge main  # or your dev branch
git push origin prod
```

That's it! GitHub Actions will automatically deploy.

## Manual Deployment

### Via GitHub Actions UI

1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**
4. Select `prod` branch
5. Click **Run workflow**

### Via SSH (Manual)

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip>

# Run deployment script
cd /home/ec2-user/portfolio-app
bash scripts/deploy.sh
```

## Workflow File Location

```
.github/workflows/deploy-prod.yml
```

## What Happens on Deployment

1. ✅ Code is checked out from `prod` branch
2. ✅ SSH connection to EC2 is established
3. ✅ Latest code is pulled
4. ✅ Docker image is rebuilt
5. ✅ Database migrations run
6. ✅ Containers are restarted
7. ✅ Health check verifies deployment

## Monitoring

### View Deployment Status

- **GitHub**: Go to **Actions** tab → Click on workflow run
- **EC2**: `sudo docker-compose ps` and `sudo docker-compose logs`

### Check Deployment Logs

```bash
# On EC2
sudo docker-compose logs -f

# Or view last 50 lines
sudo docker-compose logs --tail=50
```

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs** for error messages
2. **Verify secrets** are correctly set
3. **Test SSH connection** manually
4. **Check EC2 resources** (memory, disk space)

### Container Not Starting

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip>

# Check container status
sudo docker-compose ps

# View logs
sudo docker-compose logs

# Check disk space
df -h

# Check memory
free -h
```

## Rollback

If you need to rollback to a previous version:

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip>
cd /home/ec2-user/portfolio-app

# Find previous commit
git log --oneline -10

# Checkout previous commit
git checkout <commit-hash>

# Redeploy
bash scripts/deploy.sh
```

## Customization

### Change Branch Name

Edit `.github/workflows/deploy-prod.yml`:

```yaml
on:
  push:
    branches:
      - production  # Change from 'prod'
```

### Add Pre-deployment Tests

Add to workflow before deployment:

```yaml
- name: Run tests
  run: npm test
```

## Full Documentation

See `GITHUB_ACTIONS_SETUP.md` for complete setup instructions.

