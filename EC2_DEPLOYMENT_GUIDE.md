# EC2 Deployment Guide for shop.jonnoyip.com

This guide walks you through deploying your Next.js application with Supabase to an EC2 instance and configuring it to work with your domain `shop.jonnoyip.com`.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```
3. **Terraform** (>= 1.0) installed
   ```bash
   # macOS
   brew install terraform
   ```
4. **Domain DNS Access**: You need access to your DNS provider to create an A record
5. **SSH Key Pair**: Create an EC2 Key Pair in AWS Console
   - Go to EC2 Console → Key Pairs → Create Key Pair
   - Save the `.pem` file securely
   - Note the key pair name

## Step 1: Configure DNS (Do This First!)

Before deploying, set up your DNS record so it's ready when the instance starts:

1. **Get your domain's DNS provider** (e.g., Route53, Cloudflare, Namecheap, etc.)

2. **Create an A record** pointing to your domain:
   - **Type**: A
   - **Name**: `shop` (or `@` if it's the root domain)
   - **Value**: You'll get this from Terraform output after deployment (the EC2 instance public IP)
   - **TTL**: 300 (5 minutes) or 3600 (1 hour)

   **Note**: If you're using Route53, you can also use a CNAME record pointing to the EC2 instance's public DNS name.

3. **Wait for DNS propagation** (can take a few minutes to 48 hours, but usually 5-30 minutes)

## Step 2: Configure Terraform Variables

1. **Copy the example variables file**:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your actual values:

   ```hcl
   # AWS Configuration
   aws_region     = "us-east-1"  # Choose your preferred region
   environment    = "production"
   app_name       = "portfolio-app"
   instance_type  = "t3.medium"  # t3.small for dev, t3.medium recommended for production
   volume_size    = 20
   key_pair_name  = "your-key-pair-name"  # The name of your EC2 key pair

   # Security - IMPORTANT: Restrict SSH access to your IP
   allowed_ssh_cidr_blocks = ["YOUR.IP.ADDRESS.HERE/32"]  # Replace with your IP

   # Node.js Configuration
   node_version = "20"

   # Database Configuration (Supabase PostgreSQL)
   database_url = "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

   # Stripe Configuration
   stripe_publishable_key = "pk_live_your_key_here"  # Use live keys for production
   stripe_secret_key      = "sk_live_your_key_here"
   stripe_webhook_secret  = "whsec_your_secret_here"
   stripe_test_mode       = false

   # Email Configuration (Resend)
   resend_api_key    = "re_your_key_here"
   resend_from_email = "Shop <noreply@shop.jonnoyip.com>"

   # Admin Configuration
   admin_email        = "admin@shop.jonnoyip.com"  # Used for SSL certificate and notifications
   admin_panel_api_url = ""  # Optional
   admin_panel_api_key  = ""  # Optional
   internal_api_key     = ""  # Optional
   admin_api_key        = ""  # Optional

   # Application URL
   app_url = "https://shop.jonnoyip.com"

   # Domain Configuration
   domain_name = "shop.jonnoyip.com"  # Your domain name for SSL certificate

   # Order Storage Configuration
   order_storage_type = "internal"  # Options: internal, s3, database

   # Supabase Configuration
   supabase_url                  = "https://your-project.supabase.co"
   supabase_publishable_key      = "your_supabase_publishable_key"
   supabase_service_role_key     = "your_supabase_service_role_key"
   supabase_product_images_bucket = "product-images"
   use_supabase_images           = "true"
   supabase_use_public_images    = "false"

   # GitHub Configuration (optional - for automated deployments)
   github_repo_url = "https://github.com/yourusername/yourrepo.git"  # Or leave empty
   github_branch   = "master"
   ```

   **Important Notes**:
   - Replace all placeholder values with your actual credentials
   - Never commit `terraform.tfvars` to version control (it's in `.gitignore`)
   - For production, use live Stripe keys (not test keys)
   - Restrict `allowed_ssh_cidr_blocks` to your IP address for security

## Step 3: Initialize and Deploy

1. **Initialize Terraform**:
   ```bash
   cd terraform
   terraform init
   ```

2. **Review the deployment plan**:
   ```bash
   terraform plan
   ```
   
   This shows what resources will be created. Review carefully.

3. **Deploy the infrastructure**:
   ```bash
   terraform apply
   ```
   
   Type `yes` when prompted. This will:
   - Create security groups with proper inbound/outbound rules
   - Create IAM role and instance profile
   - Launch EC2 instance
   - Install Node.js, PM2, Nginx, Certbot
   - Clone your repository (if GitHub URL provided)
   - Install dependencies and build the Next.js app
   - Configure Nginx as reverse proxy
   - Attempt to obtain SSL certificate from Let's Encrypt

4. **Get the instance public IP**:
   ```bash
   terraform output
   ```
   
   Or check the AWS Console → EC2 → Instances

## Step 4: Complete DNS Configuration

1. **Update your DNS A record** with the EC2 instance public IP from Step 3
2. **Wait for DNS propagation** (check with `dig shop.jonnoyip.com` or `nslookup shop.jonnoyip.com`)
3. **Verify DNS is working**:
   ```bash
   ping shop.jonnoyip.com
   ```

## Step 5: SSL Certificate Setup

The deployment script attempts to automatically obtain an SSL certificate, but if it fails, you can set it up manually:

1. **SSH into your instance**:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
   ```

2. **Run Certbot manually**:
   ```bash
   sudo certbot --nginx -d shop.jonnoyip.com --non-interactive --agree-tos --email admin@shop.jonnoyip.com --redirect
   ```

3. **Test automatic renewal**:
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Set up automatic renewal** (usually already configured):
   ```bash
   sudo systemctl status certbot.timer
   ```

## Step 6: Verify Deployment

1. **Check application status**:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
   pm2 status
   pm2 logs portfolio-app
   ```

2. **Check Nginx status**:
   ```bash
   sudo systemctl status nginx
   ```

3. **Test your domain**:
   - Visit `https://shop.jonnoyip.com` in your browser
   - Verify SSL certificate is valid (green padlock)
   - Test the application functionality

## Security Group Configuration

The Terraform configuration automatically creates a security group with the following rules:

### Inbound Rules:
- **Port 80 (HTTP)**: Open to `0.0.0.0/0` - Required for Let's Encrypt and HTTP traffic
- **Port 443 (HTTPS)**: Open to `0.0.0.0/0` - Required for HTTPS traffic
- **Port 22 (SSH)**: Restricted to your IP (configured in `allowed_ssh_cidr_blocks`)
- **Port 3000 (Next.js dev)**: Open to `0.0.0.0/0` - Only needed for development/testing

### Outbound Rules:
- **All traffic**: Open to `0.0.0.0/0` - Required for:
  - Supabase API calls
  - Stripe API calls
  - Resend email API calls
  - Let's Encrypt certificate requests
  - Package downloads (npm, yum)
  - DNS resolution

## Application Management

### View Application Logs

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
pm2 logs portfolio-app
pm2 logs portfolio-app --lines 100  # Last 100 lines
```

### Restart Application

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
pm2 restart portfolio-app
```

### Update Application

#### If using GitHub:

1. **Push changes to your repository**
2. **SSH into instance**:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
   ```
3. **Pull latest changes**:
   ```bash
   cd /home/ec2-user/portfolio-app
   git pull
   npm install
   npm run build
   pm2 restart portfolio-app
   ```

#### If deploying manually:

1. **Upload your code**:
   ```bash
   scp -r -i ~/.ssh/your-key.pem ./ ec2-user@<instance-public-ip>:/home/ec2-user/portfolio-app/
   ```

2. **SSH and rebuild**:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
   cd /home/ec2-user/portfolio-app
   npm install
   npm run build
   pm2 restart portfolio-app
   ```

### Database Migrations

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-public-ip>
cd /home/ec2-user/portfolio-app
npx prisma db push
# or
npx prisma migrate deploy
```

### Update Environment Variables

1. **SSH into instance**
2. **Edit `.env.local`**:
   ```bash
   cd /home/ec2-user/portfolio-app
   nano .env.local
   ```
3. **Restart application**:
   ```bash
   pm2 restart portfolio-app
   ```

## Troubleshooting

### Application Not Accessible

1. **Check security group rules**:
   - Verify ports 80 and 443 are open
   - Check AWS Console → EC2 → Security Groups

2. **Check application is running**:
   ```bash
   ssh into instance
   pm2 status
   curl http://localhost:3000
   ```

3. **Check Nginx status**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t  # Test configuration
   ```

4. **Check Nginx logs**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

### SSL Certificate Issues

1. **Check DNS is pointing correctly**:
   ```bash
   dig shop.jonnoyip.com
   nslookup shop.jonnoyip.com
   ```

2. **Verify port 80 is accessible** (required for Let's Encrypt):
   ```bash
   curl -I http://shop.jonnoyip.com
   ```

3. **Check Certbot logs**:
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

4. **Manually request certificate**:
   ```bash
   sudo certbot --nginx -d shop.jonnoyip.com --non-interactive --agree-tos --email admin@shop.jonnoyip.com --redirect
   ```

### Database Connection Issues

1. **Verify DATABASE_URL is correct**:
   ```bash
   ssh into instance
   cd /home/ec2-user/portfolio-app
   cat .env.local | grep DATABASE_URL
   ```

2. **Test database connection**:
   ```bash
   npx prisma db pull
   ```

3. **Check Supabase connection**:
   - Verify Supabase project is active
   - Check connection pooling settings
   - Verify IP restrictions (if any) in Supabase dashboard

### Supabase Image Issues

1. **Verify environment variables**:
   ```bash
   cat .env.local | grep SUPABASE
   ```

2. **Check bucket exists** in Supabase Dashboard → Storage

3. **Verify bucket permissions** (public vs private)

### High Memory Usage

If your instance is running out of memory:

1. **Check memory usage**:
   ```bash
   free -h
   pm2 monit
   ```

2. **Consider upgrading instance type**:
   - Edit `terraform/main.tf` or `terraform.tfvars`
   - Change `instance_type` to `t3.large` or `t3.xlarge`
   - Run `terraform apply`

## Monitoring and Maintenance

### Set Up CloudWatch Monitoring

1. **Enable detailed monitoring** in `terraform.tfvars`:
   ```hcl
   enable_monitoring = true
   ```

2. **View metrics** in AWS Console → CloudWatch → Metrics

### Regular Maintenance Tasks

1. **Update system packages**:
   ```bash
   ssh into instance
   sudo yum update -y
   ```

2. **Update Node.js packages**:
   ```bash
   cd /home/ec2-user/portfolio-app
   npm update
   npm run build
   pm2 restart portfolio-app
   ```

3. **Renew SSL certificate** (automatic, but verify):
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Check disk space**:
   ```bash
   df -h
   ```

## Cost Optimization

### Estimated Monthly Costs (us-east-1):

- **t3.small**: ~$15/month (2 vCPU, 2 GB RAM) - Development
- **t3.medium**: ~$30/month (2 vCPU, 4 GB RAM) - **Recommended for production**
- **t3.large**: ~$60/month (2 vCPU, 8 GB RAM) - High traffic
- **EBS Storage (20GB)**: ~$2/month
- **Data Transfer**: Varies based on usage (~$0.09/GB after free tier)

### Cost Saving Tips:

1. **Use t3.small for development/testing**
2. **Enable CloudWatch detailed monitoring only when needed**
3. **Use Elastic IP only if necessary** (small additional cost)
4. **Monitor data transfer** and optimize images/assets

## Cleanup

To destroy all resources and stop incurring costs:

```bash
cd terraform
terraform destroy
```

**Warning**: This will delete the EC2 instance and all data on it. Make sure you have backups!

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs: `pm2 logs portfolio-app`
3. Check system logs: `sudo journalctl -u nginx`
4. Review user-data script logs: `cat /var/log/user-data.log`

