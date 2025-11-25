terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }
  }
  
  # Optional: Configure remote state backend
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "portfolio-app-cloudflare/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Portfolio-App-Cloudflare"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Fetch Cloudflare IP ranges dynamically
data "http" "cloudflare_ipv4" {
  url = "https://www.cloudflare.com/ips-v4"
  
  request_headers = {
    Accept = "text/plain"
  }
}

data "http" "cloudflare_ipv6" {
  url = "https://www.cloudflare.com/ips-v6"
  
  request_headers = {
    Accept = "text/plain"
  }
}

# Parse Cloudflare IP ranges
locals {
  # Split IPv4 ranges by newline and filter out empty strings
  cloudflare_ipv4_cidrs = [
    for cidr in split("\n", chomp(data.http.cloudflare_ipv4.response_body)) : 
    trimspace(cidr) if cidr != ""
  ]
  
  # Split IPv6 ranges by newline and filter out empty strings
  cloudflare_ipv6_cidrs = [
    for cidr in split("\n", chomp(data.http.cloudflare_ipv6.response_body)) : 
    trimspace(cidr) if cidr != ""
  ]
  
  # Combine IPv4 and IPv6 for egress rules (if needed)
  cloudflare_all_cidrs = concat(local.cloudflare_ipv4_cidrs, local.cloudflare_ipv6_cidrs)
}

# Data source to get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for EC2 Instance - Restricted to Cloudflare IPs
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-cloudflare-sg"
  description = "Security group for ${var.app_name} application - Cloudflare only ingress"
  vpc_id      = data.aws_vpc.default.id

  # HTTP access from Cloudflare IPv4 IPs only
  dynamic "ingress" {
    for_each = local.cloudflare_ipv4_cidrs
    content {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
      description = "HTTP from Cloudflare IPv4"
    }
  }

  # HTTPS access from Cloudflare IPv4 IPs only
  dynamic "ingress" {
    for_each = local.cloudflare_ipv4_cidrs
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
      description = "HTTPS from Cloudflare IPv4"
    }
  }

  # HTTP access from Cloudflare IPv6 IPs only
  dynamic "ingress" {
    for_each = local.cloudflare_ipv6_cidrs
    content {
      from_port        = 80
      to_port          = 80
      protocol         = "tcp"
      ipv6_cidr_blocks = [ingress.value]
      description      = "HTTP from Cloudflare IPv6"
    }
  }

  # HTTPS access from Cloudflare IPv6 IPs only
  dynamic "ingress" {
    for_each = local.cloudflare_ipv6_cidrs
    content {
      from_port        = 443
      to_port          = 443
      protocol         = "tcp"
      ipv6_cidr_blocks = [ingress.value]
      description      = "HTTPS from Cloudflare IPv6"
    }
  }

  # SSH access (restrict to your IP in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr_blocks
    description = "SSH"
  }

  # Next.js dev server (optional - for development/testing, restrict to your IP)
  dynamic "ingress" {
    for_each = var.enable_dev_port ? var.allowed_ssh_cidr_blocks : []
    content {
      from_port   = 3000
      to_port     = 3000
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
      description = "Next.js dev server"
    }
  }

  # Outbound internet access - Allow all egress
  # This is necessary for the app to make API calls, database connections, etc.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  # IPv6 egress (if your VPC supports IPv6)
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
    description      = "All outbound IPv6 traffic"
  }

  tags = {
    Name        = "${var.app_name}-cloudflare-sg"
    Description = "Restricted to Cloudflare IP ranges"
  }
}

# IAM Role for EC2 Instance (for S3 access if needed)
resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-cloudflare-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-cloudflare-ec2-role"
  }
}

# IAM Policy for S3 access (if ORDER_STORAGE_TYPE=s3)
resource "aws_iam_role_policy" "s3_access" {
  count = var.enable_s3_access ? 1 : 0
  
  name = "${var.app_name}-cloudflare-s3-access"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })
}

# Instance Profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.app_name}-cloudflare-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# EC2 Instance
resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  
  # Use the first available subnet
  subnet_id = data.aws_subnets.default.ids[0]

  # Enable detailed monitoring
  monitoring = var.enable_monitoring

  # Root block device
  root_block_device {
    volume_type = var.volume_type
    volume_size = var.volume_size
    encrypted   = true
  }

  # User data script
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    app_name              = var.app_name
    node_version          = var.node_version
    database_url          = var.database_url
    stripe_publishable_key = var.stripe_publishable_key
    stripe_secret_key     = var.stripe_secret_key
    stripe_webhook_secret = var.stripe_webhook_secret
    resend_api_key        = var.resend_api_key
    resend_from_email     = var.resend_from_email
    admin_email           = var.admin_email
    admin_panel_api_url   = var.admin_panel_api_url
    admin_panel_api_key   = var.admin_panel_api_key
    internal_api_key      = var.internal_api_key
    admin_api_key         = var.admin_api_key
    app_url               = var.app_url
    order_storage_type    = var.order_storage_type
    aws_access_key_id     = var.aws_access_key_id
    aws_secret_access_key = var.aws_secret_access_key
    aws_s3_bucket         = var.aws_s3_bucket
    aws_s3_region         = var.aws_s3_region
    database_api_url       = var.database_api_url
    database_api_key      = var.database_api_key
    stripe_test_mode      = var.stripe_test_mode
    github_repo_url       = var.github_repo_url
    github_branch         = var.github_branch
    github_ssh_private_key = var.github_ssh_private_key
    github_actions_ssh_public_key = var.github_actions_ssh_public_key
    domain_name           = var.domain_name
    supabase_url          = var.supabase_url
    supabase_publishable_key = var.supabase_publishable_key
    supabase_service_role_key = var.supabase_service_role_key
    supabase_product_images_bucket = var.supabase_product_images_bucket
    use_supabase_images   = var.use_supabase_images
    supabase_use_public_images = var.supabase_use_public_images
    cloudflare_enabled    = "true"
  }))

  tags = {
    Name = "${var.app_name}-cloudflare"
  }
}

# Elastic IP for static IP address
resource "aws_eip" "app_eip" {
  instance = aws_instance.app.id
  domain   = "vpc"
  
  tags = {
    Name = "${var.app_name}-cloudflare-eip"
  }
}

# Output Cloudflare IP ranges for reference
output "cloudflare_ipv4_ranges" {
  description = "Cloudflare IPv4 CIDR blocks used in security group"
  value       = local.cloudflare_ipv4_cidrs
}

output "cloudflare_ipv6_ranges" {
  description = "Cloudflare IPv6 CIDR blocks used in security group"
  value       = local.cloudflare_ipv6_cidrs
}

