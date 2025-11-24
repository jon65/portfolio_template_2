# Cloudflare DNS Deployment for yippies.net

This directory contains Terraform configuration and deployment scripts to point your Cloudflare-managed domain (`yippies.net`) to your Next.js application hosted on AWS EC2.

## Quick Start

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars` with your values:**
   - Cloudflare API token
   - EC2 instance ID or Elastic IP
   - Domain configuration

3. **Deploy:**
   ```bash
   ./deploy.sh
   ```

## Files

- **`main.tf`** - Terraform configuration for Cloudflare DNS and settings
- **`variables.tf`** - Variable definitions
- **`outputs.tf`** - Output values after deployment
- **`terraform.tfvars.example`** - Example configuration file
- **`deploy.sh`** - Automated deployment script
- **`DEPLOYMENT_GUIDE.md`** - Comprehensive step-by-step guide with explanations

## Prerequisites

- Cloudflare account with `yippies.net` added
- Cloudflare API token with Zone:Edit and DNS:Edit permissions
- AWS EC2 instance with Elastic IP (deployed via main `terraform/` directory)
- Terraform >= 1.0 installed

## Documentation

For detailed instructions, see **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**.

The guide includes:
- Architecture overview
- How Cloudflare DNS works with AWS EC2
- Step-by-step setup instructions
- Configuration explanations
- Troubleshooting guide
- Advanced configuration options

## What This Does

1. Creates DNS A record in Cloudflare pointing `yippies.net` to your EC2 Elastic IP
2. Configures SSL/TLS settings (flexible, full, or full_strict)
3. Optionally enables Cloudflare proxy (CDN, DDoS protection, caching)
4. Sets up security and performance optimizations

## Architecture

```
Internet → Cloudflare DNS → Cloudflare Proxy (optional) → AWS EC2 → Next.js App
```

## Support

See the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section for common issues.

