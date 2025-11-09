#!/bin/bash
set -e

# Update system
sudo yum update -y

# Install Node.js using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_${node_version}.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally for process management
sudo npm install -g pm2

# Install Git (if not already installed)
sudo yum install -y git

# Create application directory
APP_DIR="/home/ec2-user/${app_name}"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository if GitHub URL is provided, otherwise prepare for manual upload
%{ if github_repo_url != "" ~}
git clone -b ${github_branch} ${github_repo_url} .
%{ else ~}
# Repository will be uploaded manually or via CI/CD
echo "Waiting for application code to be uploaded..."
%{ endif ~}

# Install application dependencies
if [ -f "package.json" ]; then
    npm install --production
fi

# Generate Prisma Client
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate
fi

# Create .env.local file with all environment variables
cat > .env.local <<EOF
# Database Configuration
DATABASE_URL=${database_url}

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${stripe_publishable_key}
STRIPE_SECRET_KEY=${stripe_secret_key}
%{ if stripe_webhook_secret != "" ~}
STRIPE_WEBHOOK_SECRET=${stripe_webhook_secret}
%{ endif ~}

# Email Configuration
RESEND_API_KEY=${resend_api_key}
RESEND_FROM_EMAIL=${resend_from_email}

# Admin Configuration
ADMIN_EMAIL=${admin_email}
%{ if admin_panel_api_url != "" ~}
ADMIN_PANEL_API_URL=${admin_panel_api_url}
%{ endif ~}
%{ if admin_panel_api_key != "" ~}
ADMIN_PANEL_API_KEY=${admin_panel_api_key}
%{ endif ~}
%{ if internal_api_key != "" ~}
INTERNAL_API_KEY=${internal_api_key}
%{ endif ~}
%{ if admin_api_key != "" ~}
ADMIN_API_KEY=${admin_api_key}
%{ endif ~}
%{ if app_url != "" ~}
NEXT_PUBLIC_APP_URL=${app_url}
%{ endif ~}

# Order Storage Configuration
ORDER_STORAGE_TYPE=${order_storage_type}
NEXT_PUBLIC_ORDER_STORAGE_TYPE=${order_storage_type}
%{ if order_storage_type == "s3" ~}
AWS_ACCESS_KEY_ID=${aws_access_key_id}
AWS_SECRET_ACCESS_KEY=${aws_secret_access_key}
AWS_S3_BUCKET=${aws_s3_bucket}
AWS_S3_REGION=${aws_s3_region}
%{ endif ~}
%{ if order_storage_type == "database" ~}
DATABASE_API_URL=${database_api_url}
DATABASE_API_KEY=${database_api_key}
%{ endif ~}

# Test Mode Configuration
STRIPE_TEST_MODE=${stripe_test_mode}
NEXT_PUBLIC_STRIPE_TEST_MODE=${stripe_test_mode}
EOF

# Set proper permissions
chmod 600 .env.local
chown ec2-user:ec2-user .env.local

# Build the Next.js application
if [ -f "package.json" ]; then
    npm run build
fi

# Run Prisma migrations (if needed)
if [ -f "prisma/schema.prisma" ]; then
    npx prisma db push --accept-data-loss || true
fi

# Create PM2 ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '${app_name}',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start application with PM2
if [ -f "package.json" ]; then
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u ec2-user --hp /home/ec2-user
fi

# Install and configure Nginx as reverse proxy (optional but recommended)
sudo yum install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/${app_name}.conf > /dev/null <<EOF
upstream nextjs {
    server localhost:3000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall (if firewalld is installed)
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
fi

# Log completion
echo "Application deployment completed at $(date)" >> /var/log/user-data.log

