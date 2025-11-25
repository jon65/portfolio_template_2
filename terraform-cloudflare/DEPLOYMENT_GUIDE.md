# Cloudflare-Protected EC2 Deployment Guide

This guide walks you through deploying your Next.js application to AWS EC2 with security groups configured to **only allow traffic from Cloudflare IP ranges**. This provides enhanced security by preventing direct access to your origin server.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Cloudflare DNS Configuration](#cloudflare-dns-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Overview

This Terraform configuration creates:

- **EC2 Instance**: Running Next.js application in Docker
- **Security Group**: Restricts HTTP/HTTPS ingress to Cloudflare IP ranges only
- **Elastic IP**: Static IP address for Cloudflare DNS
- **Nginx**: Reverse proxy configured for Cloudflare headers
- **IAM Role**: For S3 access (if needed)

### Key Security Features

✅ **Cloudflare-only ingress**: Only Cloudflare IPs can access your origin server  
✅ **Dynamic IP updates**: Automatically fetches latest Cloudflare IP ranges  
✅ **Real visitor IPs**: Nginx configured to use `CF-Connecting-IP` header  
✅ **SSH restrictions**: SSH access limited to your IP address  

---

## Prerequisites

### Required Software

1. **Terraform** (>= 1.0)
   ```bash
   brew install terraform  # macOS
   # or download from https://www.terraform.io/downloads
   ```

2. **AWS CLI**
   ```bash
   brew install awscli  # macOS
   # or see https://aws.amazon.com/cli/
   ```

3. **Git**

### Required Accounts & Setup

1. **AWS Account**
   - IAM user with EC2, VPC, and IAM permissions
   - EC2 Key Pair created
   - AWS CLI configured: `aws configure`

2. **Cloudflare Account**
   - Domain added to Cloudflare
   - DNS access configured

3. **Service Credentials**
   - Database connection string
   - Stripe API keys
   - Resend API key
   - Supabase credentials (if using)

---

## Architecture

```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Cloudflare    │  ← DDoS Protection, CDN, SSL
│   (Proxy)       │
└──────┬──────────┘
       │
       │ (Only Cloudflare IPs allowed)
       ▼
┌─────────────────┐
│  Security Group │  ← Restricts to Cloudflare IP ranges
│  (EC2)          │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│     Nginx       │  ← Reverse proxy, real IP detection
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│     Docker      │  ← Next.js application
│   (Next.js)     │
└─────────────────┘
```

---

## Step-by-Step Deployment

### Step 1: Clone and Navigate

```bash
cd terraform-cloudflare
```

### Step 2: Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
# AWS Configuration
aws_region     = "us-east-1"
app_name       = "portfolio-app"
instance_type  = "t3.medium"
key_pair_name  = "your-key-pair-name"

# Security - IMPORTANT: Restrict to your IP
allowed_ssh_cidr_blocks = ["YOUR.IP.ADDRESS.HERE/32"]

# Get your IP:
# curl ifconfig.me

# Database
database_url = "postgresql://user:pass@host:5432/db"

# Stripe
stripe_publishable_key = "pk_live_..."
stripe_secret_key      = "sk_live_..."
stripe_webhook_secret  = "whsec_..."

# Email
resend_api_key    = "re_..."
resend_from_email = "Your Brand <noreply@yourdomain.com>"

# Admin
admin_email = "admin@yourdomain.com"

# Domain (used in Nginx config)
domain_name = "shop.yourdomain.com"
app_url     = "https://shop.yourdomain.com"

# ... (see terraform.tfvars.example for all options)
```

**Important**: Never commit `terraform.tfvars` to version control!

### Step 3: Initialize Terraform

```bash
terraform init
```

This downloads the AWS provider and HTTP provider (for fetching Cloudflare IPs).

### Step 4: Review Deployment Plan

```bash
terraform plan
```

Review the plan to ensure:
- ✅ Correct instance type
- ✅ Correct key pair name
- ✅ Security group allows Cloudflare IPs
- ✅ SSH access restricted to your IP

### Step 5: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This will:
1. Fetch Cloudflare IP ranges
2. Create security group with Cloudflare-only ingress
3. Launch EC2 instance
4. Configure Nginx with Cloudflare headers
5. Deploy application via Docker

**Deployment takes 5-10 minutes**.

### Step 6: Get Elastic IP

```bash
terraform output elastic_ip
```

Save this IP address - you'll need it for Cloudflare DNS.

---

## Cloudflare DNS Configuration

### ⚠️ CRITICAL: Enable Cloudflare Proxy

**You MUST enable the Cloudflare proxy (orange cloud)** for this setup to work. If the proxy is disabled (grey cloud), traffic will bypass Cloudflare and be blocked by the security group.

### Step 1: Access Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Navigate to **DNS** → **Records**

### Step 2: Create A Record

1. Click **Add record**
2. Configure:
   - **Type**: `A`
   - **Name**: Your subdomain (e.g., `shop` for `shop.yourdomain.com`)
   - **IPv4 address**: The Elastic IP from `terraform output elastic_ip`
   - **Proxy status**: **Proxied** (orange cloud) ← **IMPORTANT!**
   - **TTL**: Auto

3. Click **Save**

### Step 3: Wait for DNS Propagation

DNS changes typically propagate within 1-5 minutes. Verify:

```bash
dig shop.yourdomain.com
# Should show Cloudflare IPs, not your EC2 IP
```

---

## Verification

### 1. Check Application is Running

SSH into the instance:

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@$(terraform output -raw elastic_ip)
```

Check Docker containers:

```bash
sudo docker ps
sudo docker-compose ps
```

Check application logs:

```bash
sudo docker-compose logs -f app
```

### 2. Test Local Access

From the EC2 instance:

```bash
curl http://localhost:3000
```

### 3. Test via Cloudflare

Visit your domain in a browser:

```
https://shop.yourdomain.com
```

### 4. Verify Real Visitor IPs

Check Nginx logs:

```bash
sudo tail -f /var/log/nginx/access.log
```

You should see real visitor IPs in the `cf_ip` field, not Cloudflare IPs.

### 5. Verify Security Group

Check that only Cloudflare IPs are allowed:

```bash
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_id) \
  --query 'SecurityGroups[0].IpPermissions'
```

---

## Troubleshooting

### Application Not Accessible via Domain

**Symptom**: Can't access `https://shop.yourdomain.com`

**Solutions**:

1. **Check Cloudflare proxy is enabled**:
   - Go to Cloudflare DNS
   - Verify the A record shows orange cloud (proxied)
   - If grey cloud, click to enable proxy

2. **Verify DNS propagation**:
   ```bash
   dig shop.yourdomain.com
   nslookup shop.yourdomain.com
   ```
   Should show Cloudflare IPs, not your EC2 IP

3. **Check application is running**:
   ```bash
   ssh into instance
   sudo docker ps
   curl http://localhost:3000
   ```

4. **Check Nginx status**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

### Direct Access Blocked

**Symptom**: Can't access EC2 instance directly via IP

**This is expected!** Direct access is blocked by design. Access should only be through Cloudflare.

To test locally, SSH into the instance and use `curl http://localhost:3000`.

### Real Visitor IPs Show Cloudflare IPs

**Symptom**: Logs show Cloudflare IPs instead of visitor IPs

**Solution**: Verify Nginx configuration includes:

```nginx
real_ip_header CF-Connecting-IP;
set_real_ip_from <cloudflare-ip-ranges>;
```

The user-data script configures this automatically. Check:

```bash
sudo cat /etc/nginx/conf.d/portfolio-app.conf | grep -A 20 "real_ip"
```

### Security Group Update Needed

If Cloudflare adds new IP ranges, update the security group:

```bash
terraform apply
```

This automatically fetches the latest IP ranges.

### SSH Access Denied

**Symptom**: Can't SSH into instance

**Solutions**:

1. **Verify your IP is in allowed list**:
   ```bash
   curl ifconfig.me  # Get your current IP
   # Check terraform.tfvars: allowed_ssh_cidr_blocks
   ```

2. **Update security group**:
   - Edit `terraform.tfvars`
   - Add your IP: `allowed_ssh_cidr_blocks = ["YOUR.IP.HERE/32"]`
   - Run `terraform apply`

3. **Check key pair name**:
   ```bash
   # Verify key pair exists in AWS
   aws ec2 describe-key-pairs --key-names your-key-pair-name
   ```

---

## Security Best Practices

### 1. Restrict SSH Access

Always restrict SSH to your IP:

```hcl
allowed_ssh_cidr_blocks = ["YOUR.IP.ADDRESS/32"]
```

### 2. Enable Cloudflare Proxy

**Always** enable the proxy (orange cloud) in Cloudflare DNS. This ensures:
- Traffic goes through Cloudflare
- DDoS protection is active
- SSL/TLS is handled by Cloudflare
- Security group rules work correctly

### 3. Regular Updates

Keep Cloudflare IP ranges updated:

```bash
terraform apply  # Fetches latest IPs
```

### 4. Monitor Access

Monitor security group for unauthorized access attempts:

```bash
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_id)
```

### 5. Use Strong Credentials

- Use strong database passwords
- Rotate API keys regularly
- Use IAM roles instead of access keys when possible

### 6. Enable CloudWatch Monitoring

Enable detailed monitoring in `terraform.tfvars`:

```hcl
enable_monitoring = true
```

### 7. Regular Backups

- Backup your database regularly
- Keep backups of environment variables
- Document your infrastructure

---

## Advanced Configuration

### Custom Cloudflare IP Ranges

If you need to use custom IP ranges (not recommended), modify `main.tf`:

```hcl
locals {
  cloudflare_ipv4_cidrs = [
    "173.245.48.0/20",
    # ... your custom ranges
  ]
}
```

### Multiple Domains

To support multiple domains, add additional Nginx server blocks in the user-data script.

### SSL/TLS Configuration

When using Cloudflare proxy:
- Cloudflare handles SSL/TLS termination
- Origin server can use HTTP (port 80)
- Or use Cloudflare Origin Certificate for additional security

### Rate Limiting

Configure rate limiting in Cloudflare Dashboard:
- Go to Security → WAF
- Create rate limiting rules

---

## Cost Optimization

### Instance Sizing

- **Development**: `t3.small` (~$15/month)
- **Production**: `t3.medium` (~$30/month) - Recommended
- **High Traffic**: `t3.large` (~$60/month)

### Monitoring Costs

```bash
# View estimated costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This permanently deletes:
- EC2 instance and all data
- Security group
- Elastic IP
- IAM role

Make sure you have backups!

---

## Additional Resources

- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [Cloudflare Real IP Headers](https://developers.cloudflare.com/fundamentals/get-started/reference/http-request-headers/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Nginx Real IP Module](http://nginx.org/en/docs/http/ngx_http_realip_module.html)

---

## Quick Reference

### Common Commands

```bash
# Deploy
terraform init
terraform plan
terraform apply

# Get outputs
terraform output
terraform output elastic_ip

# SSH into instance
ssh -i ~/.ssh/key.pem ec2-user@$(terraform output -raw elastic_ip)

# View logs
sudo docker-compose logs -f app
sudo tail -f /var/log/nginx/access.log

# Restart application
sudo docker-compose restart app

# Destroy
terraform destroy
```

### Important Files

- `main.tf` - Infrastructure definition
- `variables.tf` - Variable definitions
- `terraform.tfvars` - Your configuration (DO NOT COMMIT)
- `user-data.sh` - Bootstrap script
- `outputs.tf` - Output values

---

**Last Updated**: 2024  
**Terraform Version**: >= 1.0  
**AWS Provider Version**: ~> 5.0

