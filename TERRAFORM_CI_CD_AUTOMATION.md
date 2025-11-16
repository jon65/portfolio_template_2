# Terraform CI/CD Automation Guide

This document explains what `terraform apply` automatically sets up vs what needs manual configuration.

## What `terraform apply` Automatically Does ✅

When you run `terraform apply`, the `user-data.sh` script automatically:

### 1. **EC2 Instance Setup** ✅
- Creates EC2 instance with proper security groups
- Configures SSH access via EC2 key pair
- Sets up all networking (inbound/outbound rules)

### 2. **System & Software Installation** ✅
- Updates system packages
- Installs Docker and Docker Compose
- Installs Git and SSH client
- Configures Docker to start on boot

### 3. **GitHub Repository Access** ✅
- Sets up SSH keys for EC2 to access private GitHub repos
- Clones your repository (if `github_repo_url` is provided)
- Checks out the specified branch

### 4. **Application Deployment** ✅
- Creates `.env.local` with all environment variables
- Builds Docker image
- Runs database migrations
- Starts application containers
- Configures Nginx reverse proxy
- Obtains SSL certificate automatically

### 5. **GitHub Actions SSH Access** ✅ (NEW!)
- Adds GitHub Actions SSH public key to `authorized_keys`
- Allows GitHub Actions to SSH into EC2 for CI/CD deployments

## What Still Needs Manual Setup ⚠️

### 1. **GitHub Repository Setup** (One-time)
- Create `prod` branch in your GitHub repository
- Ensure GitHub Actions is enabled (usually enabled by default)

### 2. **GitHub Secrets Configuration** (One-time)
Go to: **Repository Settings** → **Secrets and variables** → **Actions**

Add these secrets:
- `EC2_HOST`: Your EC2 public IP or domain
- `EC2_SSH_PRIVATE_KEY`: The **private** key corresponding to the public key you added to Terraform

### 3. **Generate SSH Key Pair for GitHub Actions** (One-time)

You need to generate an SSH key pair for GitHub Actions:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions@deploy" -f ~/.ssh/github-actions-deploy

# This creates two files:
# ~/.ssh/github-actions-deploy      (private key - use in GitHub Secrets)
# ~/.ssh/github-actions-deploy.pub  (public key - use in terraform.tfvars)
```

**Add to Terraform:**
```hcl
# In terraform.tfvars
github_actions_ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions@deploy"
```

**Add to GitHub Secrets:**
- Secret name: `EC2_SSH_PRIVATE_KEY`
- Value: Contents of `~/.ssh/github-actions-deploy` (the private key)

## Complete Setup Flow

### Step 1: Generate SSH Keys

```bash
# Generate key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions@deploy" -f ~/.ssh/github-actions-deploy

# View public key (for Terraform)
cat ~/.ssh/github-actions-deploy.pub

# View private key (for GitHub Secrets)
cat ~/.ssh/github-actions-deploy
```

### Step 2: Configure Terraform

Edit `terraform/terraform.tfvars`:

```hcl
# GitHub Configuration
github_repo_url = "https://github.com/yourusername/yourrepo.git"
github_branch = "prod"  # or "master" if you haven't created prod branch yet

# SSH key for EC2 to access GitHub (if private repo)
github_ssh_private_key = file("~/.ssh/your-github-deploy-key")

# SSH public key for GitHub Actions to access EC2 (REQUIRED for CI/CD)
github_actions_ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions@deploy"
```

### Step 3: Deploy with Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**This automatically:**
- ✅ Creates EC2 instance
- ✅ Installs Docker and all dependencies
- ✅ Clones your repository
- ✅ Sets up GitHub Actions SSH access
- ✅ Deploys your application
- ✅ Configures SSL

### Step 4: Configure GitHub Secrets

After `terraform apply` completes:

1. Get your EC2 public IP:
   ```bash
   terraform output instance_public_ip
   ```

2. Go to GitHub: **Repository Settings** → **Secrets and variables** → **Actions**

3. Add secrets:
   - `EC2_HOST`: Your EC2 IP (from step 1)
   - `EC2_SSH_PRIVATE_KEY`: Contents of `~/.ssh/github-actions-deploy` (private key)

### Step 5: Create Prod Branch (if needed)

```bash
# On your local machine
git checkout -b prod
git push origin prod
```

### Step 6: Test CI/CD

```bash
# Make a change and push to prod
git checkout prod
# ... make changes ...
git add .
git commit -m "Test deployment"
git push origin prod
```

GitHub Actions will automatically deploy! 🚀

## Summary: Automation vs Manual

| Task | Automated by Terraform? | Manual Setup Required? |
|------|------------------------|------------------------|
| EC2 instance creation | ✅ Yes | ❌ No |
| Docker installation | ✅ Yes | ❌ No |
| Repository cloning | ✅ Yes | ❌ No |
| GitHub Actions SSH setup | ✅ Yes | ❌ No |
| Application deployment | ✅ Yes | ❌ No |
| SSL certificate | ✅ Yes | ❌ No |
| GitHub Secrets | ❌ No | ✅ Yes (one-time) |
| Create prod branch | ❌ No | ✅ Yes (one-time) |
| Generate SSH keys | ❌ No | ✅ Yes (one-time) |

## Troubleshooting

### GitHub Actions Can't SSH

**Problem**: GitHub Actions workflow fails with "Permission denied"

**Solution**:
1. Verify `github_actions_ssh_public_key` is set in `terraform.tfvars`
2. Re-run `terraform apply` to add the key
3. Or manually add it:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<ec2-ip>
   echo "your-github-actions-public-key" >> ~/.ssh/authorized_keys
   ```

### Repository Not Cloned

**Problem**: Repository not found on EC2

**Solution**:
1. Check `github_repo_url` is set in `terraform.tfvars`
2. Verify `github_ssh_private_key` is correct (for private repos)
3. Check user-data logs: `sudo cat /var/log/cloud-init-output.log`

### CI/CD Deployment Fails

**Problem**: GitHub Actions can't deploy

**Solution**:
1. Verify GitHub Secrets are set correctly
2. Test SSH manually: `ssh -i ~/.ssh/github-actions-deploy ec2-user@<ec2-ip>`
3. Check EC2 security group allows SSH from GitHub Actions IPs

## Next Steps

After `terraform apply`:
1. ✅ EC2 instance is running
2. ✅ Application is deployed
3. ✅ GitHub Actions can SSH in (if public key provided)
4. ⚠️ Configure GitHub Secrets (one-time)
5. ⚠️ Create prod branch (if needed)
6. ✅ Push to prod → Auto-deploy!

## Additional Resources

- See `GITHUB_ACTIONS_SETUP.md` for detailed CI/CD setup
- See `EC2_DEPLOYMENT_GUIDE.md` for EC2 deployment details
- See `CI_CD_QUICKSTART.md` for quick reference

