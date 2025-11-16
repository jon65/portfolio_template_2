# EC2 Deployment Quick Start

Quick reference for deploying to EC2 with domain `shop.jonnoyip.com`.

## Prerequisites Checklist

- [ ] AWS account with CLI configured (`aws configure`)
- [ ] Terraform installed (`brew install terraform`)
- [ ] EC2 Key Pair created in AWS Console
- [ ] Domain DNS access (to create A record)
- [ ] All environment variables ready (Supabase, Stripe, Resend, etc.)

## Quick Deployment Steps

### 1. Configure DNS (Do First!)

Create an A record in your DNS provider:
- **Type**: A
- **Name**: `shop`
- **Value**: (Will be EC2 public IP - get after deployment)
- **TTL**: 300

### 2. Configure Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

**Key variables to set**:
- `key_pair_name`: Your EC2 key pair name
- `domain_name`: `"shop.jonnoyip.com"`
- `admin_email`: Your email (for SSL certificate)
- `database_url`: Your Supabase connection string
- `supabase_url`: Your Supabase project URL
- `supabase_publishable_key`: Your Supabase publishable key
- `stripe_publishable_key`: Your Stripe publishable key
- `stripe_secret_key`: Your Stripe secret key
- `resend_api_key`: Your Resend API key
- `allowed_ssh_cidr_blocks`: `["YOUR.IP.ADDRESS/32"]` (restrict SSH access)

### 3. Deploy

```bash
terraform init
terraform plan  # Review what will be created
terraform apply  # Type 'yes' to confirm
```

### 4. Update DNS

After deployment, get the public IP:
```bash
terraform output instance_public_ip
```

Update your DNS A record with this IP address.

### 5. Verify

Wait 5-30 minutes for DNS propagation, then:
- Visit `https://shop.jonnoyip.com`
- Check SSL certificate (should be automatic via Let's Encrypt)

## Security Group Rules (Auto-configured)

**Inbound**:
- Port 80 (HTTP) - Open to all
- Port 443 (HTTPS) - Open to all
- Port 22 (SSH) - Restricted to your IP
- Port 3000 (Next.js) - Open to all (dev only)

**Outbound**:
- All traffic - Open (for Supabase, Stripe, Resend, etc.)

## Common Commands

### SSH into instance
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<public-ip>
```

### View logs
```bash
sudo docker logs portfolio-app
sudo docker logs -f portfolio-app  # Follow logs
```

### Restart app
```bash
sudo docker restart portfolio-app
```

### Update app (if using GitHub)
```bash
cd /home/ec2-user/portfolio-app
git pull
sudo docker build -t portfolio-app:latest .
sudo docker stop portfolio-app
sudo docker rm portfolio-app
sudo docker run -d --name portfolio-app --restart unless-stopped -p 3000:3000 --env-file .env.local -e NODE_ENV=production -e PORT=3000 portfolio-app:latest
```

### Check SSL certificate
```bash
sudo certbot certificates
```

### Manually renew SSL
```bash
sudo certbot renew
```

## Troubleshooting

**App not accessible?**
- Check security group allows ports 80/443
- Verify app is running: `sudo docker ps`
- Check container logs: `sudo docker logs portfolio-app`
- Check Nginx: `sudo systemctl status nginx`

**SSL not working?**
- Verify DNS points to EC2 IP: `dig shop.jonnoyip.com`
- Check port 80 is accessible (required for Let's Encrypt)
- Manually run: `sudo certbot --nginx -d shop.jonnoyip.com`

**Database connection issues?**
- Verify `DATABASE_URL` in `.env.local`
- Check Supabase project is active
- Test: `npx prisma db pull`

## Full Documentation

See `EC2_DEPLOYMENT_GUIDE.md` for comprehensive documentation.

