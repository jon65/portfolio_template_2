# Understanding user-data.sh

This document explains how the `user-data.sh` script works in the EC2 deployment setup.

## What is user-data.sh?

`user-data.sh` is a **bash script that runs automatically when an EC2 instance first boots up**. It's executed as root (or with sudo privileges) and sets up the entire application environment from scratch.

## How It Works

### 1. **Terraform Template Processing**

The script uses **Terraform template syntax** (`%{ }` blocks) to inject variables from your `terraform.tfvars` file:

```bash
%{ if github_repo_url != "" ~}
git clone -b ${github_branch} ${github_repo_url} .
%{ else ~}
echo "Waiting for application code to be uploaded..."
%{ endif ~}
```

- `%{ if condition ~}` - Conditional logic
- `${variable_name}` - Variable substitution
- `%{ endif ~}` - End conditional block

**Before execution**, Terraform processes this template and replaces all variables with actual values from your configuration.

### 2. **Execution Flow**

The script runs in this order:

#### **Phase 1: System Setup** (Lines 1-15)
```bash
#!/bin/bash
set -e  # Exit immediately if any command fails
```

- **Updates system packages** (`yum update`)
- **Installs Node.js** from NodeSource repository
- **Installs PM2** (process manager for Node.js)
- **Installs Git** (for cloning repositories)

#### **Phase 2: Application Setup** (Lines 17-38)
```bash
APP_DIR="/home/ec2-user/${app_name}"
mkdir -p $APP_DIR
cd $APP_DIR
```

- **Creates application directory** (`/home/ec2-user/portfolio-app`)
- **Clones repository** (if GitHub URL provided) or prepares for manual upload
- **Installs npm dependencies** (`npm install --production`)
- **Generates Prisma Client** (database ORM)

#### **Phase 3: Environment Configuration** (Lines 40-111)
```bash
cat > .env.local <<EOF
DATABASE_URL=${database_url}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${stripe_publishable_key}
# ... more variables
EOF
```

- **Creates `.env.local` file** with all environment variables
- **Conditionally includes variables** based on configuration:
  - Supabase variables (if provided)
  - S3 variables (if `order_storage_type == "s3"`)
  - Admin panel variables (if provided)
- **Sets secure permissions** (`chmod 600`) - only owner can read/write

#### **Phase 4: Build & Database** (Lines 117-125)
```bash
npm run build  # Build Next.js application
npx prisma db push  # Run database migrations
```

- **Builds the Next.js application** for production
- **Runs Prisma migrations** to sync database schema

#### **Phase 5: Process Management** (Lines 127-152)
```bash
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'portfolio-app',
    script: 'npm',
    args: 'start',
    # ...
  }]
}
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

- **Creates PM2 configuration** for process management
- **Starts the application** with PM2
- **Saves PM2 process list** (survives reboots)
- **Configures PM2 to start on boot** (systemd integration)

#### **Phase 6: Web Server Setup** (Lines 154-208)
```bash
sudo yum install -y nginx certbot python3-certbot-nginx
```

- **Installs Nginx** (reverse proxy)
- **Installs Certbot** (for SSL certificates)

**Nginx Configuration:**
```nginx
upstream nextjs {
    server localhost:3000;  # Points to Next.js app
}

server {
    listen 80;
    server_name shop.jonnoyip.com;
    
    location / {
        proxy_pass http://nextjs;  # Forward requests to Next.js
        # ... proxy headers for proper forwarding
    }
}
```

- **Configures Nginx** as reverse proxy (forwards port 80 → port 3000)
- **Starts and enables Nginx** (auto-start on boot)
- **Requests SSL certificate** from Let's Encrypt (if domain provided)
- **Automatically configures HTTPS** redirect

#### **Phase 7: Firewall & Logging** (Lines 210-218)
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
```

- **Configures firewall** (if firewalld is installed)
- **Logs completion** to `/var/log/user-data.log`

## Key Features

### 1. **Conditional Logic**

The script uses Terraform conditionals to include/exclude sections:

```bash
%{ if supabase_url != "" ~}
NEXT_PUBLIC_SUPABASE_URL=${supabase_url}
%{ endif ~}
```

Only includes Supabase variables if `supabase_url` is provided.

### 2. **Error Handling**

```bash
set -e  # Exit on error
npx prisma db push --accept-data-loss || true  # Continue even if migration fails
```

- `set -e` stops execution on any error
- `|| true` allows certain commands to fail without stopping the script

### 3. **Security**

```bash
chmod 600 .env.local  # Only owner can read/write
chown ec2-user:ec2-user .env.local  # Set proper ownership
```

Environment file is protected from other users.

### 4. **Automatic SSL**

```bash
sudo certbot --nginx -d ${domain_name} --non-interactive --agree-tos --email ${admin_email} --redirect
```

Automatically:
- Requests SSL certificate from Let's Encrypt
- Configures Nginx for HTTPS
- Sets up HTTP → HTTPS redirect
- Configures auto-renewal

## How Variables Are Injected

When Terraform runs, it processes the template:

**In `main.tf`:**
```hcl
user_data = base64encode(templatefile("${path.module}/user-data.sh", {
  app_name = var.app_name
  domain_name = var.domain_name
  # ... all variables
}))
```

**Process:**
1. Terraform reads `user-data.sh`
2. Replaces all `${variable}` and `%{ if }` blocks with actual values
3. Base64 encodes the result
4. Passes it to EC2 as user-data
5. EC2 decodes and executes it on first boot

## Execution Context

- **Runs as**: Root (via sudo) or ec2-user
- **Runs when**: Instance first boots up
- **Runs where**: `/var/lib/cloud/instances/[instance-id]/user-data.txt`
- **Logs**: `/var/log/cloud-init-output.log` and `/var/log/user-data.log`

## Viewing Execution Logs

After deployment, you can check if the script ran successfully:

```bash
# SSH into instance
ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>

# View user-data execution log
sudo cat /var/log/cloud-init-output.log

# View custom log
cat /var/log/user-data.log
```

## Common Issues

### 1. **Script Fails Early**

If the script fails, check:
- Network connectivity (for package downloads)
- DNS resolution
- AWS security group allows outbound traffic

### 2. **SSL Certificate Fails**

Common causes:
- DNS not pointing to EC2 instance yet
- Port 80 not accessible from internet
- Rate limiting from Let's Encrypt

**Solution**: Run manually after DNS propagates:
```bash
sudo certbot --nginx -d shop.jonnoyip.com
```

### 3. **Application Not Starting**

Check:
- PM2 status: `pm2 status`
- PM2 logs: `pm2 logs portfolio-app`
- Application build succeeded: `ls -la .next/`

### 4. **Environment Variables Missing**

Verify `.env.local` was created:
```bash
cat /home/ec2-user/portfolio-app/.env.local
```

## Modifying the Script

To add custom setup steps:

1. **Edit `user-data.sh`** in the terraform directory
2. **Add your commands** (they'll run in order)
3. **Use Terraform variables** with `${variable_name}` syntax
4. **Run `terraform apply`** to update the instance

**Note**: User-data only runs on first boot. To re-run:
- Create a new instance, or
- Manually execute the script via SSH

## Best Practices

1. **Use conditionals** for optional features
2. **Add error handling** (`|| true` for non-critical commands)
3. **Log important steps** for debugging
4. **Test in a dev environment** first
5. **Keep sensitive data** in Terraform variables (marked as `sensitive = true`)

## Summary

The `user-data.sh` script is a **fully automated setup script** that:
- ✅ Installs all required software
- ✅ Configures the application
- ✅ Sets up environment variables
- ✅ Builds and starts the app
- ✅ Configures web server and SSL
- ✅ Ensures everything starts on boot

All of this happens **automatically** when the EC2 instance first starts, making deployment a one-command process: `terraform apply`.

