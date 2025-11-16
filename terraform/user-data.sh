#!/bin/bash
set -e

# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git and SSH client
sudo yum install -y git openssh-clients

# Set up SSH access for GitHub Actions (CI/CD)
%{ if github_actions_ssh_public_key != "" ~}
# Create .ssh directory for ec2-user if it doesn't exist
sudo -u ec2-user mkdir -p /home/ec2-user/.ssh
sudo -u ec2-user chmod 700 /home/ec2-user/.ssh

# Add GitHub Actions public key to authorized_keys
sudo -u ec2-user bash <<GITHUB_ACTIONS_SSH
if [ ! -f ~/.ssh/authorized_keys ]; then
  touch ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
fi

# Check if key already exists to avoid duplicates
if ! grep -q "${github_actions_ssh_public_key}" ~/.ssh/authorized_keys 2>/dev/null; then
  echo "${github_actions_ssh_public_key}" >> ~/.ssh/authorized_keys
  echo "GitHub Actions SSH key added to authorized_keys"
else
  echo "GitHub Actions SSH key already exists in authorized_keys"
fi
GITHUB_ACTIONS_SSH
%{ endif ~}

# Create application directory
APP_DIR="/home/ec2-user/${app_name}"
sudo mkdir -p $APP_DIR
sudo chown ec2-user:ec2-user $APP_DIR
cd $APP_DIR

# Set up SSH for private GitHub repository
%{ if github_repo_url != "" && github_ssh_private_key != "" ~}
# Create .ssh directory for ec2-user
sudo -u ec2-user mkdir -p /home/ec2-user/.ssh
sudo -u ec2-user chmod 700 /home/ec2-user/.ssh

# Write SSH private key as ec2-user
sudo -u ec2-user bash <<'EC2USER_SCRIPT'
cat > ~/.ssh/id_rsa <<'SSHKEY'
${github_ssh_private_key}
SSHKEY
chmod 600 ~/.ssh/id_rsa

# Add GitHub to known_hosts to avoid host key verification prompt
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
chmod 644 ~/.ssh/known_hosts
EC2USER_SCRIPT

# Convert HTTPS URL to SSH URL if needed
GITHUB_SSH_URL="${github_repo_url}"
if [[ "$GITHUB_SSH_URL" == https://github.com/* ]]; then
    GITHUB_SSH_URL=$(echo "$GITHUB_SSH_URL" | sed 's|https://github.com/|git@github.com:|')
elif [[ "$GITHUB_SSH_URL" == https://*.github.com/* ]]; then
    GITHUB_SSH_URL=$(echo "$GITHUB_SSH_URL" | sed 's|https://\(.*\)\.github\.com/|git@\1.github.com:|')
fi

# Clone repository using SSH as ec2-user
echo "Cloning repository from ${GITHUB_SSH_URL}..."
sudo -u ec2-user bash <<EC2USER_CLONE
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/home/ec2-user/.ssh/known_hosts -i /home/ec2-user/.ssh/id_rsa"
cd $APP_DIR
git clone -b ${github_branch} "$GITHUB_SSH_URL" .
EC2USER_CLONE

%{ elif github_repo_url != "" ~}
# Clone public repository (no SSH key needed)
git clone -b ${github_branch} ${github_repo_url} .
%{ else ~}
# Repository will be uploaded manually or via CI/CD
echo "Waiting for application code to be uploaded..."
%{ endif ~}

# Note: Dependencies and build will be handled by Docker

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

# Supabase Configuration
%{ if supabase_url != "" ~}
NEXT_PUBLIC_SUPABASE_URL=${supabase_url}
%{ endif ~}
%{ if supabase_publishable_key != "" ~}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${supabase_publishable_key}
%{ endif ~}
%{ if supabase_service_role_key != "" ~}
SUPABASE_SERVICE_ROLE_KEY=${supabase_service_role_key}
%{ endif ~}
%{ if supabase_product_images_bucket != "" ~}
SUPABASE_PRODUCT_IMAGES_BUCKET=${supabase_product_images_bucket}
%{ endif ~}
%{ if use_supabase_images != "" ~}
USE_SUPABASE_IMAGES=${use_supabase_images}
%{ endif ~}
%{ if supabase_use_public_images != "" ~}
SUPABASE_USE_PUBLIC_IMAGES=${supabase_use_public_images}
%{ endif ~}
EOF

# Set proper permissions
sudo chmod 600 .env.local
sudo chown ec2-user:ec2-user .env.local

# Wait for Docker to be ready
# Note: usermod takes effect on next login, but we can use sudo for docker commands
sleep 2

# Build and start using docker-compose
if [ -f "docker-compose.yml" ]; then
    cd $APP_DIR
    
    # Set APP_NAME environment variable for docker-compose
    export APP_NAME=${app_name}
    
    # Stop and remove existing containers if they exist
    sudo docker-compose down 2>/dev/null || true
    
    # Build the Docker image using docker-compose
    echo "Building Docker image..."
    sudo docker-compose build --no-cache
    
    # Run Prisma migrations before starting the app
    if [ -f "prisma/schema.prisma" ]; then
        echo "Running database migrations..."
        sudo docker-compose run --rm app \
            sh -c "npx prisma db push --accept-data-loss" || echo "Database migration skipped or failed"
    fi
    
    # Start the application using docker-compose
    echo "Starting application with docker-compose..."
    sudo docker-compose up -d
    
    # Wait for container to be ready
    echo "Waiting for container to start..."
    sleep 15
    
    # Check if container is running
    if sudo docker-compose ps | grep -q "Up"; then
        echo "Application container is running"
        sudo docker-compose ps
    else
        echo "Warning: Container may not be running. Check logs with: sudo docker-compose logs"
    fi
    
elif [ -f "Dockerfile" ]; then
    # Fallback to direct docker commands if docker-compose.yml is not found
    cd $APP_DIR
    
    # Build the Docker image
    sudo docker build -t ${app_name}:latest .
    
    # Stop and remove existing container if it exists
    sudo docker stop ${app_name} 2>/dev/null || true
    sudo docker rm ${app_name} 2>/dev/null || true
    
    # Run Prisma migrations
    if [ -f "prisma/schema.prisma" ]; then
        echo "Running database migrations..."
        sudo docker run --rm \
            --env-file .env.local \
            ${app_name}:latest \
            sh -c "cd /app && npx prisma db push --accept-data-loss" || echo "Database migration skipped or failed"
    fi
    
    # Start the application container
    sudo docker run -d \
        --name ${app_name} \
        --restart unless-stopped \
        -p 3000:3000 \
        --env-file .env.local \
        -e NODE_ENV=production \
        -e PORT=3000 \
        ${app_name}:latest
    
    sleep 15
    
    if sudo docker ps | grep -q ${app_name}; then
        echo "Container ${app_name} is running"
    else
        echo "Warning: Container ${app_name} may not be running. Check logs with: sudo docker logs ${app_name}"
    fi
else
    echo "Neither docker-compose.yml nor Dockerfile found. Skipping Docker setup."
fi

# Install and configure Nginx as reverse proxy
sudo yum install -y nginx

# Install Certbot for SSL certificates
sudo yum install -y certbot python3-certbot-nginx

# Create initial Nginx configuration (HTTP only for now)
sudo tee /etc/nginx/conf.d/${app_name}.conf > /dev/null <<EOF
upstream nextjs {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name %{ if domain_name != "" ~}${domain_name}%{ else ~}_%{ endif ~};

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

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
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Create directory for Let's Encrypt challenges
sudo mkdir -p /var/www/certbot

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Wait for Nginx to be ready
sleep 5

# Obtain SSL certificate if domain is provided
%{ if domain_name != "" && admin_email != "" ~}
# Request SSL certificate from Let's Encrypt
sudo certbot --nginx -d ${domain_name} --non-interactive --agree-tos --email ${admin_email} --redirect || echo "SSL certificate setup failed - you can run certbot manually later"
%{ endif ~}

# Configure firewall (if firewalld is installed)
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
fi

# Log completion
echo "Application deployment completed at $(date)" >> /var/log/user-data.log

