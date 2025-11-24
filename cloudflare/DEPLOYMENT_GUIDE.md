# Cloudflare DNS Deployment Guide for yippies.net

This guide walks you through deploying your Next.js application on AWS EC2 with Cloudflare DNS management for `yippies.net`. This setup provides DDoS protection, CDN caching, and SSL/TLS termination through Cloudflare while your application runs on EC2.

## Table of Contents

1. [Overview and Architecture](#overview-and-architecture)
2. [How It Works](#how-it-works)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Configuration Explained](#configuration-explained)
6. [Deployment Process](#deployment-process)
7. [Verification and Testing](#verification-and-testing)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## Overview and Architecture

### What This Setup Does

This deployment configuration creates a bridge between **Cloudflare DNS** (managing `yippies.net`) and your **AWS EC2 instance** (hosting your Next.js application). Here's the high-level flow:

```
Internet User
    ↓
Cloudflare DNS (yippies.net)
    ↓
Cloudflare Proxy/CDN (optional - orange cloud)
    ↓
AWS EC2 Instance (Elastic IP)
    ↓
Next.js Application (port 3000)
    ↓
Nginx Reverse Proxy (port 80/443)
```

### Key Components

1. **Cloudflare DNS**: Manages DNS records for `yippies.net`
2. **Cloudflare Proxy**: Optional CDN and DDoS protection layer
3. **AWS EC2**: Your application server
4. **Elastic IP**: Static IP address for your EC2 instance
5. **Terraform**: Infrastructure as Code to manage everything

---

## How It Works

### DNS Resolution Flow

When a user visits `yippies.net`, here's what happens:

1. **DNS Query**: User's browser queries DNS for `yippies.net`
2. **Cloudflare DNS**: Returns the Elastic IP of your EC2 instance
3. **Traffic Routing**:
   - **If proxied (orange cloud)**: Traffic goes through Cloudflare's network first
     - Cloudflare provides DDoS protection
     - Content is cached at edge locations
     - SSL/TLS is terminated at Cloudflare
     - Then forwarded to your EC2 instance
   - **If not proxied (grey cloud)**: Traffic goes directly to EC2
     - No caching or DDoS protection
     - Direct connection

### SSL/TLS Modes Explained

Cloudflare offers different SSL modes depending on your EC2 setup:

#### Flexible SSL (Recommended for Start)
- **Visitor → Cloudflare**: HTTPS (encrypted)
- **Cloudflare → EC2**: HTTP (unencrypted)
- **Use when**: Your EC2 instance doesn't have an SSL certificate
- **Pros**: Easy setup, automatic HTTPS for visitors
- **Cons**: Traffic between Cloudflare and EC2 is unencrypted

#### Full SSL
- **Visitor → Cloudflare**: HTTPS (encrypted)
- **Cloudflare → EC2**: HTTPS (encrypted, but certificate not verified)
- **Use when**: Your EC2 has a self-signed or invalid certificate
- **Pros**: End-to-end encryption
- **Cons**: Cloudflare doesn't verify the certificate

#### Full (Strict) SSL (Recommended for Production)
- **Visitor → Cloudflare**: HTTPS (encrypted)
- **Cloudflare → EC2**: HTTPS (encrypted, with valid certificate)
- **Use when**: Your EC2 has a valid SSL certificate (e.g., from Let's Encrypt)
- **Pros**: Full security, certificate validation
- **Cons**: Requires proper SSL setup on EC2

### Why Use Cloudflare Proxy?

**Benefits:**
- **DDoS Protection**: Automatic mitigation of attacks
- **CDN**: Content cached at edge locations worldwide
- **Performance**: Faster page loads for global users
- **Bandwidth Savings**: Reduced traffic to your EC2 instance
- **Analytics**: Detailed traffic and security analytics

**Trade-offs:**
- **Latency**: Small additional latency (usually <50ms)
- **Cache Invalidation**: Need to purge cache when content updates
- **IP Address**: Your EC2 sees Cloudflare IPs, not visitor IPs (use `CF-Connecting-IP` header)

---

## Prerequisites

### 1. Cloudflare Account Setup

1. **Create Cloudflare Account**
   - Go to [cloudflare.com](https://www.cloudflare.com) and sign up
   - Add your domain `yippies.net` to Cloudflare
   - Update your domain's nameservers at your registrar to point to Cloudflare

2. **Get Cloudflare API Token**
   - Go to [Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use "Edit zone DNS" template or create custom token with:
     - **Permissions**: `Zone:Edit`, `Zone:Read`, `DNS:Edit`
     - **Zone Resources**: Include `yippies.net`
   - Copy the token (you won't see it again!)

### 2. AWS EC2 Instance

Your EC2 instance should already be set up with:
- ✅ Next.js application running
- ✅ Elastic IP assigned
- ✅ Security group allowing HTTP (80) and HTTPS (443) traffic
- ✅ Nginx configured as reverse proxy (if using SSL)

**If you haven't set up EC2 yet:**
- Use the main `terraform/` directory to deploy EC2 infrastructure first
- See `terraform/DEPLOYMENT_GUIDE.md` for EC2 setup instructions

### 3. Required Tools

- **Terraform** (>= 1.0): [Installation Guide](https://www.terraform.io/downloads)
- **AWS CLI** (optional): For automatically fetching EC2 information
- **Git**: For cloning the repository

---

## Step-by-Step Setup

### Step 1: Navigate to Cloudflare Directory

```bash
cd cloudflare
```

### Step 2: Configure Terraform Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
# Required: Cloudflare API Token
cloudflare_api_token = "your_api_token_here"

# Required: Your domain
cloudflare_zone_name = "yippies.net"
domain_name = "yippies.net"

# Required: EC2 Information (choose one method)
# Method 1: EC2 Instance ID (Terraform will auto-detect Elastic IP)
ec2_instance_id = "i-0123456789abcdef0"

# Method 2: Elastic IP Allocation ID (preferred)
# ec2_eip_allocation_id = "eipalloc-0123456789abcdef0"

# Method 3: Elastic IP Public Address
# ec2_public_ip = "54.123.45.67"

# SSL Configuration
ssl_mode = "flexible"  # Start with "flexible", upgrade to "full_strict" later

# Enable Cloudflare Proxy (recommended)
cloudflare_proxy_enabled = true
```

### Step 3: Get Your EC2 Information

You need to provide one of the following:

#### Option A: EC2 Instance ID (Easiest)
```bash
# If you deployed EC2 with Terraform, get the instance ID:
cd ../terraform
terraform output instance_id
# Copy the output (e.g., i-0123456789abcdef0)
```

#### Option B: Elastic IP Allocation ID
```bash
# Get Elastic IP allocation ID from AWS Console or CLI:
aws ec2 describe-addresses --query 'Addresses[?InstanceId==`i-0123456789abcdef0`].AllocationId' --output text
```

#### Option C: Elastic IP Public Address
```bash
# Get Elastic IP from Terraform output:
cd ../terraform
terraform output elastic_ip
# Copy the IP address (e.g., 54.123.45.67)
```

### Step 4: Initialize Terraform

```bash
cd cloudflare
terraform init
```

This will:
- Download the Cloudflare Terraform provider
- Download the AWS Terraform provider (for fetching EC2 info)
- Initialize the Terraform backend

### Step 5: Review the Plan

```bash
terraform plan
```

This shows you what Terraform will create:
- Cloudflare DNS A record pointing `yippies.net` to your EC2 Elastic IP
- Optional www subdomain record
- SSL/TLS settings
- Security and performance optimizations

**Review carefully** before proceeding!

### Step 6: Deploy

#### Option A: Using the Deployment Script (Recommended)
```bash
./deploy.sh
```

The script will:
- Check prerequisites
- Initialize Terraform
- Validate configuration
- Show the plan
- Ask for confirmation
- Apply changes
- Show outputs

#### Option B: Manual Deployment
```bash
terraform apply
```

Type `yes` when prompted.

### Step 7: Wait for DNS Propagation

DNS changes typically propagate within:
- **Cloudflare**: Immediate (seconds)
- **Global DNS**: 5-30 minutes (usually faster)

You can check propagation status:
```bash
# Using dig
dig yippies.net

# Using nslookup
nslookup yippies.net

# Online tool
# Visit: https://www.whatsmydns.net/#A/yippies.net
```

---

## Configuration Explained

### DNS Configuration

```hcl
# Root domain A record
resource "cloudflare_record" "root" {
  zone_id = data.cloudflare_zone.main.id
  name    = "@"  # "@" means root domain (yippies.net)
  value   = "54.123.45.67"  # Your EC2 Elastic IP
  type    = "A"
  ttl     = 1  # Automatic TTL when proxied
  proxied = true  # Enable Cloudflare proxy (orange cloud)
}
```

**What this does:**
- Creates an A record for `yippies.net` → `54.123.45.67`
- `proxied = true` enables Cloudflare's CDN and DDoS protection
- `ttl = 1` means automatic TTL (Cloudflare manages it)

### SSL/TLS Configuration

```hcl
resource "cloudflare_zone_settings_override" "ssl" {
  settings {
    ssl = "flexible"  # or "full", "full_strict"
    min_tls_version = "1.2"
    always_use_https = "on"
  }
}
```

**SSL Mode Decision Tree:**

```
Does your EC2 have a valid SSL certificate?
├─ No → Use "flexible" (EC2 can use HTTP)
└─ Yes → Does Cloudflare verify the certificate?
    ├─ No → Use "full"
    └─ Yes → Use "full_strict" (recommended)
```

### Proxy vs. Direct Connection

**Proxied (Orange Cloud) - `proxied = true`:**
```
User → Cloudflare Edge → EC2
     ↑                    ↑
  HTTPS                HTTP/HTTPS
  (DDoS protected)     (depending on SSL mode)
```

**Direct (Grey Cloud) - `proxied = false`:**
```
User → EC2
     ↑
  HTTP/HTTPS
  (direct connection)
```

**When to use each:**
- **Proxied**: Most use cases (DDoS protection, CDN, caching)
- **Direct**: When you need real visitor IPs, custom SSL, or bypass Cloudflare

---

## Deployment Process

### What Happens During Deployment

1. **Terraform Initialization**
   - Downloads providers
   - Sets up backend

2. **Data Source Queries**
   - Fetches Cloudflare zone information
   - Fetches EC2 instance or Elastic IP information

3. **Resource Creation**
   - Creates DNS A record
   - Configures SSL/TLS settings
   - Sets up security and performance optimizations

4. **DNS Propagation**
   - Cloudflare updates DNS immediately
   - Global DNS servers update within minutes

### Deployment Outputs

After deployment, Terraform outputs:
- DNS record information
- EC2 Elastic IP being used
- Domain URL
- SSL mode
- Next steps

Example output:
```
dns_record_value = "54.123.45.67"
dns_record_proxied = true
domain_url = "https://yippies.net"
ssl_mode = "flexible"
```

---

## Verification and Testing

### 1. Check DNS Records

```bash
# Check A record
dig yippies.net +short
# Should return your EC2 Elastic IP

# Check with Cloudflare's DNS
dig @1.1.1.1 yippies.net
```

### 2. Test HTTP/HTTPS Access

```bash
# Test HTTP (should redirect to HTTPS if always_use_https is enabled)
curl -I http://yippies.net

# Test HTTPS
curl -I https://yippies.net

# Check SSL certificate
openssl s_client -connect yippies.net:443 -servername yippies.net
```

### 3. Verify Cloudflare Proxy

```bash
# Check if proxied (should show Cloudflare IPs)
curl -I https://yippies.net | grep -i "cf-"

# Check Cloudflare headers
curl -I https://yippies.net | grep -i "server"
# Should show "cloudflare" if proxied
```

### 4. Test from Browser

1. Visit `https://yippies.net`
2. Check browser developer tools → Network tab
3. Look for Cloudflare headers (if proxied)
4. Verify SSL certificate is valid

### 5. Check Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select `yippies.net` zone
3. Check **DNS** tab → Verify A record exists
4. Check **SSL/TLS** tab → Verify SSL mode
5. Check **Analytics** → Should show traffic

---

## Troubleshooting

### DNS Not Resolving

**Problem**: `dig yippies.net` doesn't return your IP

**Solutions**:
1. **Check Cloudflare zone**: Ensure `yippies.net` is added to Cloudflare
2. **Check nameservers**: Verify your registrar points to Cloudflare nameservers
3. **Wait for propagation**: DNS can take up to 48 hours (usually much faster)
4. **Check Terraform state**: `terraform show` to verify DNS record was created

```bash
# Verify DNS record in Cloudflare
terraform output dns_record_value

# Check Cloudflare directly
dig @1.1.1.1 yippies.net
```

### SSL Certificate Errors

**Problem**: Browser shows SSL certificate error

**Solutions**:

1. **If using "flexible" mode**:
   - Error shouldn't occur (Cloudflare handles SSL)
   - If it does, check Cloudflare SSL/TLS settings

2. **If using "full" or "full_strict"**:
   - Ensure EC2 has valid SSL certificate
   - Check Nginx configuration
   - Verify certificate is not expired

```bash
# Check SSL on EC2
ssh ec2-user@your-ec2-ip
sudo certbot certificates

# Test SSL locally on EC2
curl -I https://localhost
```

### Site Not Accessible

**Problem**: DNS resolves but site doesn't load

**Checklist**:
1. **EC2 instance is running**: Check AWS Console
2. **Security group allows traffic**: Ports 80 and 443 open
3. **Application is running**: SSH into EC2 and check
4. **Nginx is running**: `sudo systemctl status nginx`

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@your-ec2-ip

# Check application
sudo docker ps
curl http://localhost:3000

# Check Nginx
sudo systemctl status nginx
sudo nginx -t
```

### Cloudflare Proxy Issues

**Problem**: Site works with proxy off but not with proxy on

**Solutions**:
1. **Check SSL mode**: If using "full_strict", ensure EC2 has valid certificate
2. **Check origin server**: Ensure EC2 accepts connections from Cloudflare IPs
3. **Check firewall**: Don't block Cloudflare IP ranges

```bash
# Temporarily disable proxy to test
# Edit terraform.tfvars:
cloudflare_proxy_enabled = false
terraform apply
```

### Getting Real Visitor IPs

**Problem**: EC2 logs show Cloudflare IPs instead of visitor IPs

**Solution**: Use `CF-Connecting-IP` header (Cloudflare automatically adds this)

```nginx
# In Nginx configuration
log_format cloudflare '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"$http_referer" "$http_user_agent" '
                      'cf_ip="$http_cf_connecting_ip"';

access_log /var/log/nginx/access.log cloudflare;
```

---

## Advanced Configuration

### Custom Page Rules

Create page rules for specific URL patterns:

```hcl
resource "cloudflare_page_rule" "api_cache" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "yippies.net/api/*"
  priority = 1
  status   = "active"

  actions {
    cache_level = "bypass"  # Don't cache API responses
  }
}
```

### Firewall Rules

Add firewall rules for security:

```hcl
resource "cloudflare_ruleset" "security" {
  zone_id     = data.cloudflare_zone.main.id
  name        = "Security Rules"
  description = "Security rules for yippies.net"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(ip.geoip.country eq \"CN\" and http.request.uri.path contains \"/admin\")"
    description = "Block admin access from specific countries"
  }
}
```

### Workers (Edge Computing)

Deploy Cloudflare Workers for edge computing:

```javascript
// Example: Add custom headers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('X-Custom-Header', 'Value')
  return newResponse
}
```

### Rate Limiting

Protect against abuse:

```hcl
resource "cloudflare_rate_limit" "api" {
  zone_id = data.cloudflare_zone.main.id
  threshold = 100
  period = 60
  match {
    request {
      url_pattern = "yippies.net/api/*"
      schemes = ["HTTP", "HTTPS"]
    }
  }
  action {
    mode = "simulate"  # or "ban"
    timeout = 300
  }
}
```

### Cache Purging

Purge cache when content updates:

```bash
# Using Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Or using Terraform
terraform apply -replace=cloudflare_record.root
```

---

## Cost Considerations

### Cloudflare Pricing

- **Free Plan**: Includes DNS, basic DDoS protection, SSL, CDN
- **Pro Plan** ($20/month): Advanced features, better performance
- **Business Plan** ($200/month): Enterprise features

**For most use cases, the Free plan is sufficient!**

### AWS Costs

- **EC2 Instance**: Varies by instance type
- **Elastic IP**: Free when attached to running instance
- **Data Transfer**: 
  - With Cloudflare proxy: Reduced (cached content served from edge)
  - Without proxy: Full data transfer costs

**Cloudflare proxy can significantly reduce AWS data transfer costs!**

---

## Best Practices

### 1. Start with Flexible SSL
- Easier setup
- Upgrade to full_strict later when EC2 has SSL

### 2. Enable Cloudflare Proxy
- Free DDoS protection
- CDN benefits
- Bandwidth savings

### 3. Monitor Analytics
- Use Cloudflare dashboard to monitor traffic
- Set up alerts for unusual activity

### 4. Regular Updates
- Keep Terraform providers updated
- Review and update SSL/TLS settings
- Monitor Cloudflare announcements

### 5. Security
- Use strong Cloudflare API tokens
- Rotate tokens regularly
- Enable 2FA on Cloudflare account
- Review firewall rules regularly

---

## Next Steps

After successful deployment:

1. **Set up monitoring**: CloudWatch for EC2, Cloudflare Analytics for DNS
2. **Configure backups**: Regular EC2 snapshots
3. **Set up CI/CD**: Automated deployments
4. **Optimize caching**: Configure cache rules for your content
5. **Set up alerts**: Monitor uptime and performance

---

## Additional Resources

- [Cloudflare Documentation](https://developers.cloudflare.com/)
- [Terraform Cloudflare Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Cloudflare SSL Modes Explained](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)

---

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review Terraform outputs: `terraform output`
3. Check Cloudflare dashboard for errors
4. Review EC2 logs: `ssh ec2-user@ip` → `sudo docker logs`
5. Check Terraform state: `terraform show`

---

**Happy Deploying! 🚀**

