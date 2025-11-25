# Terraform Deployment Guide: AWS EC2

This comprehensive guide walks you through deploying your Next.js portfolio application to AWS EC2 using Terraform. The deployment includes Docker containerization, Nginx reverse proxy, SSL certificates, and automated setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [Terraform Configuration](#terraform-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Application Management](#application-management)
7. [Troubleshooting](#troubleshooting)
8. [Cost Optimization](#cost-optimization)
9. [Cleanup](#cleanup)

---

## Prerequisites

### Required Software

1. **Terraform** (>= 1.0)
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   
   # Verify installation
   terraform version
   ```

2. **AWS CLI** (v2 recommended)
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Verify installation
   aws --version
   ```

3. **Git** (for cloning repositories)
   ```bash
   # Usually pre-installed, but verify:
   git --version
   ```

### Required Accounts & Credentials

1. **AWS Account** with appropriate permissions
2. **Domain Name** (optional but recommended for production)
3. **Service API Keys**:
   - Stripe API keys (publishable and secret)
   - Resend API key (for emails)
   - Supabase credentials (if using Supabase)
   - Database connection string (PostgreSQL)

---

## AWS Account Setup

### 1. Configure AWS CLI

```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Get from AWS Console → IAM → Users → Security Credentials
- **AWS Secret Access Key**: Same location as above
- **Default region**: e.g., `us-east-1`
- **Default output format**: `json`

**Security Best Practice**: Create an IAM user with limited permissions instead of using root credentials.

### 2. Create IAM User (Recommended)

1. Go to AWS Console → IAM → Users → Create User
2. Name: `terraform-deployer`
3. Attach policies:
   - `AmazonEC2FullAccess` (or create custom policy with minimal permissions)
   - `AmazonRoute53FullAccess` (if using Route53)
   - `AmazonS3FullAccess` (if using S3 for order storage)
4. Create access key and use those credentials with `aws configure`

### 3. Create EC2 Key Pair

1. Go to AWS Console → EC2 → Key Pairs → Create Key Pair
2. Name: `portfolio-app-key` (or your preferred name)
3. Key pair type: `RSA` or `ED25519`
4. Private key file format: `.pem` (for OpenSSH)
5. Download and save the `.pem` file securely
6. Set proper permissions:
   ```bash
   chmod 400 ~/.ssh/portfolio-app-key.pem
   ```

**Important**: Note the exact key pair name - you'll need it in Terraform configuration.

### 4. (Optional) Set Up Route53 Hosted Zone

If you want Terraform to automatically configure DNS:

1. Go to AWS Console → Route53 → Hosted Zones
2. Create hosted zone for your domain (e.g., `jonnoyip.com`)
3. Note the hosted zone name - you'll use it in Terraform variables

---

## Terraform Configuration

### Step 1: Navigate to Terraform Directory

```bash
cd terraform
```

### Step 2: Create Variables File

```bash
cp terraform.tfvars.example terraform.tfvars
```

### Step 3: Configure Variables

Edit `terraform.tfvars` with your actual values:

```hcl
# ============================================
# AWS Configuration
# ============================================
aws_region     = "us-east-1"  # Choose your preferred region
environment    = "production"  # or "staging", "development"
app_name       = "portfolio-app"
instance_type  = "t3.medium"   # t3.small for dev, t3.medium for production
volume_size    = 20            # GB
key_pair_name  = "portfolio-app-key"  # Must match your EC2 key pair name

# ============================================
# Security Configuration
# ============================================
# IMPORTANT: Restrict SSH access to your IP address for security
# Find your IP: curl ifconfig.me
allowed_ssh_cidr_blocks = ["YOUR.IP.ADDRESS.HERE/32"]

# ============================================
# Node.js Configuration
# ============================================
node_version = "20"

# ============================================
# Database Configuration
# ============================================
# PostgreSQL connection string (Supabase, RDS, or other)
database_url = "postgresql://user:password@host:5432/database?pgbouncer=true&connection_limit=1"

# ============================================
# Stripe Configuration
# ============================================
stripe_publishable_key = "pk_live_your_key_here"  # Use live keys for production
stripe_secret_key      = "sk_live_your_key_here"
stripe_webhook_secret  = "whsec_your_secret_here"
stripe_test_mode       = false  # Set to true for testing

# ============================================
# Email Configuration (Resend)
# ============================================
resend_api_key    = "re_your_key_here"
resend_from_email = "Your Brand <noreply@yourdomain.com>"

# ============================================
# Admin Configuration
# ============================================
admin_email         = "admin@yourdomain.com"  # Used for SSL certificate
admin_panel_api_url = ""  # Optional: External admin panel API
admin_panel_api_key = ""  # Optional
internal_api_key    = ""  # Optional
admin_api_key       = ""  # Optional: For retrieving orders via API

# ============================================
# Application URL
# ============================================
app_url = "https://yourdomain.com"  # Your production URL

# ============================================
# Domain Configuration
# ============================================
domain_name       = "shop.yourdomain.com"  # Your domain name
route53_zone_name = "yourdomain.com"       # Optional: Auto-detected if not provided

# ============================================
# Order Storage Configuration
# ============================================
# Options: "internal" (file system), "s3" (AWS S3), "database" (external API)
order_storage_type = "internal"

# S3 Configuration (if order_storage_type = "s3")
enable_s3_access   = false
s3_bucket_name     = ""
aws_access_key_id  = ""
aws_secret_access_key = ""
aws_s3_bucket      = ""
aws_s3_region      = "us-east-1"

# Database API Configuration (if order_storage_type = "database")
database_api_url = ""
database_api_key = ""

# ============================================
# GitHub Configuration (Optional)
# ============================================
# For automated deployments from GitHub
github_repo_url = "git@github.com:username/repo.git"  # SSH URL for private repos
github_branch   = "master"

# SSH Private Key for Private GitHub Repository
# Required if github_repo_url points to a private repository
# Paste your SSH private key here (entire key including BEGIN/END lines)
github_ssh_private_key = <<-EOT
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
  ...
  -----END OPENSSH PRIVATE KEY-----
EOT

# SSH Public Key for GitHub Actions CI/CD
# Required for automated deployments via GitHub Actions
github_actions_ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions@deploy"

# ============================================
# Supabase Configuration
# ============================================
supabase_url                  = "https://your-project.supabase.co"
supabase_publishable_key      = "your_supabase_publishable_key"
supabase_service_role_key     = "your_supabase_service_role_key"
supabase_product_images_bucket = "product-images"
use_supabase_images           = "true"
supabase_use_public_images    = "false"
```

**Important Notes**:
- Never commit `terraform.tfvars` to version control (it contains sensitive data)
- Replace all placeholder values with your actual credentials
- For production, use live Stripe keys (not test keys)
- Restrict `allowed_ssh_cidr_blocks` to your IP address for security
- If using Route53, ensure the hosted zone exists before deployment

### Step 4: Review Terraform Files

The Terraform configuration includes:

- **`main.tf`**: Main infrastructure definition (EC2, security groups, IAM roles)
- **`variables.tf`**: Variable definitions
- **`outputs.tf`**: Output values (IP addresses, URLs, etc.)
- **`user-data.sh`**: Bootstrap script that runs on instance launch

---

## Deployment Steps

### Step 1: Initialize Terraform

```bash
cd terraform
terraform init
```

This downloads the AWS provider and initializes the backend. You should see:
```
Terraform has been successfully initialized!
```

### Step 2: Validate Configuration

```bash
terraform validate
```

This checks for syntax errors. Fix any issues before proceeding.

### Step 3: Review Deployment Plan

```bash
terraform plan
```

This shows what resources will be created:
- EC2 instance
- Security group
- IAM role and instance profile
- Elastic IP
- Route53 record (if domain configured)

**Review the plan carefully** to ensure:
- Correct instance type
- Correct key pair name
- Correct security group rules
- Correct domain configuration

### Step 4: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This will:
1. Create AWS resources
2. Launch EC2 instance
3. Run user-data script which:
   - Installs Docker and Docker Compose
   - Clones your repository (if GitHub URL provided)
   - Creates `.env.local` with environment variables
   - Builds and starts Docker containers
   - Configures Nginx as reverse proxy
   - Attempts to obtain SSL certificate from Let's Encrypt

**Deployment typically takes 5-10 minutes**.

### Step 5: Get Deployment Information

After deployment completes, get the outputs:

```bash
terraform output
```

This shows:
- Instance public IP
- Instance ID
- Application URL
- SSH command
- Elastic IP (if configured)

Save these values for reference.

### Step 6: Verify Deployment

1. **Check instance status**:
   ```bash
   aws ec2 describe-instances --instance-ids $(terraform output -raw instance_id)
   ```

2. **SSH into instance** (wait 2-3 minutes after deployment):
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   ```

3. **Check Docker containers**:
   ```bash
   sudo docker ps
   sudo docker-compose ps
   ```

4. **Check application logs**:
   ```bash
   sudo docker-compose logs -f app
   ```

5. **Test application**:
   ```bash
   curl http://localhost:3000
   ```

---

## Post-Deployment Configuration

### 1. DNS Configuration

If you're **not using Route53** (Terraform didn't configure DNS automatically):

1. Get the Elastic IP from Terraform output:
   ```bash
   terraform output elastic_ip
   ```

2. Create an A record in your DNS provider:
   - **Type**: A
   - **Name**: `shop` (or your subdomain)
   - **Value**: The Elastic IP from above
   - **TTL**: 300 (5 minutes)

3. Wait for DNS propagation (5-30 minutes typically)

### 2. SSL Certificate Setup

If SSL certificate wasn't automatically obtained:

1. **SSH into instance**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   ```

2. **Run Certbot manually**:
   ```bash
   sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com --redirect
   ```

3. **Test automatic renewal**:
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Verify SSL certificate**:
   - Visit `https://yourdomain.com` in browser
   - Check for green padlock icon

### 3. Verify Application

1. **Access your application**:
   - HTTP: `http://yourdomain.com` or `http://<instance-ip>`
   - HTTPS: `https://yourdomain.com` (after SSL setup)

2. **Test key functionality**:
   - Homepage loads
   - Products display correctly
   - Cart functionality works
   - Checkout process works
   - Admin panel accessible (if configured)

### 4. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook`
3. Select events to listen to (e.g., `payment_intent.succeeded`)
4. Copy the webhook signing secret
5. Update `terraform.tfvars` with the webhook secret
6. Re-run `terraform apply` to update the instance

---

## Application Management

### View Application Logs

```bash
# SSH into instance
ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)

# View Docker logs
sudo docker-compose logs -f app

# View last 100 lines
sudo docker-compose logs --tail=100 app

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Application

```bash
ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
cd /home/ec2-user/portfolio-app
sudo docker-compose restart app
```

### Update Application Code

#### Option 1: Using GitHub (Recommended)

1. **Push changes to your repository**

2. **SSH into instance**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   ```

3. **Pull and rebuild**:
   ```bash
   cd /home/ec2-user/portfolio-app
   git pull
   sudo docker-compose down
   sudo docker-compose build --no-cache
   sudo docker-compose up -d
   ```

#### Option 2: Manual Upload

1. **Upload code**:
   ```bash
   scp -r -i ~/.ssh/portfolio-app-key.pem ./ ec2-user@$(terraform output -raw instance_public_ip):/home/ec2-user/portfolio-app/
   ```

2. **SSH and rebuild**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   cd /home/ec2-user/portfolio-app
   sudo docker-compose down
   sudo docker-compose build --no-cache
   sudo docker-compose up -d
   ```

### Update Environment Variables

1. **SSH into instance**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   ```

2. **Edit `.env.local`**:
   ```bash
   cd /home/ec2-user/portfolio-app
   nano .env.local
   ```

3. **Restart application**:
   ```bash
   sudo docker-compose restart app
   ```

**Note**: For permanent changes, update `terraform.tfvars` and re-run `terraform apply`.

### Run Database Migrations

```bash
ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
cd /home/ec2-user/portfolio-app

# Run migrations inside Docker container
sudo docker-compose exec app npx prisma db push
# or
sudo docker-compose exec app npx prisma migrate deploy
```

### Monitor Resources

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check Docker resource usage
sudo docker stats

# Check system logs
sudo journalctl -u docker
sudo journalctl -u nginx
```

---

## Troubleshooting

### Application Not Accessible

1. **Check security group rules**:
   ```bash
   aws ec2 describe-security-groups --group-ids $(terraform output -raw security_group_id)
   ```
   Ensure ports 80 and 443 are open.

2. **Check instance status**:
   ```bash
   aws ec2 describe-instance-status --instance-ids $(terraform output -raw instance_id)
   ```

3. **Check application is running**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   sudo docker ps
   curl http://localhost:3000
   ```

4. **Check Nginx status**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t  # Test configuration
   ```

### SSL Certificate Issues

1. **Check DNS is pointing correctly**:
   ```bash
   dig yourdomain.com
   nslookup yourdomain.com
   ```

2. **Verify port 80 is accessible** (required for Let's Encrypt):
   ```bash
   curl -I http://yourdomain.com
   ```

3. **Check Certbot logs**:
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

4. **Manually request certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com --redirect
   ```

### Database Connection Issues

1. **Verify DATABASE_URL is correct**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   cd /home/ec2-user/portfolio-app
   cat .env.local | grep DATABASE_URL
   ```

2. **Test database connection**:
   ```bash
   sudo docker-compose exec app npx prisma db pull
   ```

3. **Check Supabase connection**:
   - Verify Supabase project is active
   - Check connection pooling settings
   - Verify IP restrictions in Supabase dashboard

### Docker Container Issues

1. **Check container logs**:
   ```bash
   sudo docker-compose logs app
   ```

2. **Check container status**:
   ```bash
   sudo docker ps -a
   ```

3. **Restart containers**:
   ```bash
   sudo docker-compose restart
   ```

4. **Rebuild containers**:
   ```bash
   sudo docker-compose down
   sudo docker-compose build --no-cache
   sudo docker-compose up -d
   ```

### High Memory Usage

1. **Check memory usage**:
   ```bash
   free -h
   sudo docker stats
   ```

2. **Upgrade instance type**:
   - Edit `terraform.tfvars`: Change `instance_type` to `t3.large` or `t3.xlarge`
   - Run `terraform apply`

### SSH Connection Issues

1. **Verify key pair name matches**:
   ```bash
   # Check in terraform.tfvars
   key_pair_name = "portfolio-app-key"
   ```

2. **Check key file permissions**:
   ```bash
   chmod 400 ~/.ssh/portfolio-app-key.pem
   ```

3. **Verify security group allows SSH**:
   ```bash
   aws ec2 describe-security-groups --group-ids $(terraform output -raw security_group_id) --query 'SecurityGroups[0].IpPermissions'
   ```

4. **Check your IP is in allowed list**:
   ```bash
   curl ifconfig.me  # Get your current IP
   # Verify it's in allowed_ssh_cidr_blocks in terraform.tfvars
   ```

---

## Cost Optimization

### Estimated Monthly Costs (us-east-1)

- **t3.small**: ~$15/month (2 vCPU, 2 GB RAM) - Development
- **t3.medium**: ~$30/month (2 vCPU, 4 GB RAM) - **Recommended for production**
- **t3.large**: ~$60/month (2 vCPU, 8 GB RAM) - High traffic
- **EBS Storage (20GB)**: ~$2/month
- **Elastic IP**: Free (if attached to running instance)
- **Data Transfer**: ~$0.09/GB after free tier (first 100GB free)

### Cost Saving Tips

1. **Use t3.small for development/testing**
2. **Enable CloudWatch detailed monitoring only when needed** (adds ~$2/month)
3. **Use Elastic IP only if necessary** (free if attached)
4. **Monitor data transfer** and optimize images/assets
5. **Use AWS Free Tier** (first 12 months): 750 hours/month of t2.micro/t3.micro

### Monitoring Costs

```bash
# View AWS billing dashboard
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Cleanup

### Destroy All Resources

To stop all AWS resources and avoid charges:

```bash
cd terraform
terraform destroy
```

Type `yes` when prompted. This will:
- Terminate EC2 instance
- Delete security group
- Release Elastic IP
- Delete Route53 record (if configured)
- Delete IAM role and instance profile

**Warning**: This permanently deletes all data on the instance. Make sure you have backups!

### Partial Cleanup

To keep some resources:

1. **Comment out resources** in `main.tf` that you want to keep
2. **Run** `terraform apply` to remove only uncommented resources

### Backup Before Destroying

1. **Export environment variables**:
   ```bash
   ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)
   cd /home/ec2-user/portfolio-app
   cat .env.local > ~/backup-env.local
   ```

2. **Download important files**:
   ```bash
   scp -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip):/home/ec2-user/portfolio-app/.env.local ~/
   ```

---

## Advanced Configuration

### Remote State Backend (S3)

To store Terraform state remotely (recommended for team collaboration):

1. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://your-terraform-state-bucket
   aws s3api put-bucket-versioning --bucket your-terraform-state-bucket --versioning-configuration Status=Enabled
   ```

2. **Uncomment backend configuration** in `main.tf`:
   ```hcl
   backend "s3" {
     bucket = "your-terraform-state-bucket"
     key    = "portfolio-app/terraform.tfstate"
     region = "us-east-1"
   }
   ```

3. **Re-initialize Terraform**:
   ```bash
   terraform init -migrate-state
   ```

### Multiple Environments

Create separate directories for different environments:

```
terraform/
  ├── environments/
  │   ├── dev/
  │   │   ├── terraform.tfvars
  │   │   └── backend.tf
  │   ├── staging/
  │   │   ├── terraform.tfvars
  │   │   └── backend.tf
  │   └── production/
  │       ├── terraform.tfvars
  │       └── backend.tf
  ├── main.tf
  ├── variables.tf
  └── outputs.tf
```

### CI/CD Integration

See `TERRAFORM_CI_CD_AUTOMATION.md` for GitHub Actions integration.

---

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Terraform logs: `terraform apply` output
3. Check instance logs: `cat /var/log/user-data.log` (on instance)
4. Review application logs: `sudo docker-compose logs app`
5. Check AWS CloudWatch Logs (if enabled)

---

## Quick Reference

### Common Commands

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Deploy
terraform apply

# Destroy
terraform destroy

# Get outputs
terraform output

# SSH into instance
ssh -i ~/.ssh/portfolio-app-key.pem ec2-user@$(terraform output -raw instance_public_ip)

# View logs
sudo docker-compose logs -f app

# Restart app
sudo docker-compose restart app
```

### Important Files

- `terraform/main.tf` - Infrastructure definition
- `terraform/variables.tf` - Variable definitions
- `terraform/terraform.tfvars` - Your configuration (DO NOT COMMIT)
- `terraform/user-data.sh` - Bootstrap script
- `docker-compose.yml` - Docker configuration
- `Dockerfile` - Docker image definition

---

**Last Updated**: 2024
**Terraform Version**: >= 1.0
**AWS Provider Version**: ~> 5.0

