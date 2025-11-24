# Deployment Guide for shop.jonnoyip.com

This guide walks you through deploying your Next.js application to AWS EC2 with Route53 DNS configuration for `shop.jonnoyip.com`.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Route53 Hosted Zone** for `jonnoyip.com` must exist in your AWS account
   - If it doesn't exist, create it in Route53 Console first
   - Go to Route53 → Hosted zones → Create hosted zone
   - Enter `jonnoyip.com` as the domain name
3. **EC2 Key Pair** created in AWS Console
4. **Terraform** installed (>= 1.0)
5. **AWS CLI** configured with your credentials

## Step-by-Step Deployment

### 1. Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set at minimum:

```hcl
# AWS Configuration
aws_region     = "us-east-1"  # Choose your preferred region
app_name       = "shop-app"
instance_type  = "t3.medium"  # Recommended for Next.js
key_pair_name  = "your-key-pair-name"  # Your EC2 key pair name

# Domain Configuration
domain_name = "shop.jonnoyip.com"
route53_zone_name = "jonnoyip.com"  # Optional, auto-detected if not set

# Required Application Variables
database_url = "postgresql://..."
stripe_publishable_key = "pk_..."
stripe_secret_key = "sk_..."
resend_api_key = "re_..."
admin_email = "your-email@example.com"  # Required for SSL certificate

# GitHub Configuration (if using automated deployment)
github_repo_url = "git@github.com:username/repo.git"
github_branch = "main"
github_ssh_private_key = <<-EOT
  -----BEGIN OPENSSH PRIVATE KEY-----
  ...
  -----END OPENSSH PRIVATE KEY-----
EOT
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the Deployment Plan

```bash
terraform plan
```

This will show you:
- EC2 instance that will be created
- Security groups
- Elastic IP
- Route53 DNS record
- IAM roles

Review the plan carefully before proceeding.

### 4. Deploy the Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This will:
1. Create the EC2 instance
2. Assign an Elastic IP
3. Create Route53 A record pointing `shop.jonnoyip.com` to the Elastic IP
4. Run the user-data script which:
   - Installs Docker and Docker Compose
   - Clones your GitHub repository (if configured)
   - Sets up environment variables
   - Builds and starts your Next.js application
   - Configures Nginx as reverse proxy
   - Obtains SSL certificate from Let's Encrypt

### 5. Wait for Deployment

The deployment process takes approximately 5-10 minutes:
- EC2 instance startup: ~2 minutes
- Docker image build: ~3-5 minutes
- SSL certificate provisioning: ~1-2 minutes

You can monitor the progress by:
```bash
# Get the instance IP
terraform output instance_public_ip

# SSH into the instance to check logs
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>

# Check user-data script logs
tail -f /var/log/user-data.log

# Check Docker containers
sudo docker ps
sudo docker-compose logs -f
```

### 6. Verify Deployment

After deployment completes:

1. **Check DNS propagation**:
   ```bash
   dig shop.jonnoyip.com
   # or
   nslookup shop.jonnoyip.com
   ```
   The A record should point to your Elastic IP.

2. **Access your application**:
   ```bash
   # Get the application URL
   terraform output app_url
   ```
   Visit `https://shop.jonnoyip.com` in your browser.

3. **Check SSL certificate**:
   The SSL certificate should be automatically configured. Verify by visiting `https://shop.jonnoyip.com` - you should see a valid SSL certificate.

## Post-Deployment

### View Application Logs

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
cd /home/ec2-user/shop-app
sudo docker-compose logs -f
```

### Update Application

If using GitHub:
```bash
# Push changes to your repository
git push origin main

# SSH into instance
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>

# Pull and rebuild
cd /home/ec2-user/shop-app
git pull
sudo docker-compose down
sudo docker-compose build
sudo docker-compose up -d
```

### Run Database Migrations

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
cd /home/ec2-user/shop-app
sudo docker-compose exec app npx prisma db push
```

## Troubleshooting

### Route53 DNS Not Working

1. Verify the hosted zone exists:
   ```bash
   aws route53 list-hosted-zones --query "HostedZones[?Name=='jonnoyip.com.']"
   ```

2. Check the Route53 record was created:
   ```bash
   terraform output route53_record
   ```

3. Verify DNS propagation (can take up to 48 hours, usually much faster):
   ```bash
   dig shop.jonnoyip.com
   ```

### SSL Certificate Issues

1. Check Certbot logs:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
   sudo certbot certificates
   sudo journalctl -u certbot.timer
   ```

2. Manually request certificate:
   ```bash
   sudo certbot --nginx -d shop.jonnoyip.com --non-interactive --agree-tos --email your-email@example.com
   ```

### Application Not Accessible

1. Check if the application is running:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
   sudo docker ps
   curl http://localhost:3000
   ```

2. Check Nginx status:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. Check security group rules allow traffic on ports 80 and 443

### Instance Not Starting

1. Check instance status in AWS Console
2. View instance logs:
   ```bash
   aws ec2 get-console-output --instance-id <instance-id>
   ```
3. Check user-data script logs:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
   cat /var/log/user-data.log
   ```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete:
- EC2 instance and all data
- Elastic IP (will be released)
- Route53 DNS record
- Security groups
- IAM roles

## Cost Estimation

Approximate monthly costs (us-east-1):
- **t3.medium EC2 instance**: ~$30/month
- **EBS Storage (20GB)**: ~$2/month
- **Elastic IP**: Free (when attached to running instance)
- **Route53 hosted zone**: ~$0.50/month (if you don't already have one)
- **Route53 queries**: First 1 billion queries/month free
- **Data Transfer**: Varies based on usage

Total: ~$32-35/month for basic setup

## Next Steps

- Set up automated deployments with GitHub Actions
- Configure CloudWatch monitoring and alarms
- Set up automated backups
- Consider using an Application Load Balancer for high availability
- Set up CloudFront CDN for better performance

