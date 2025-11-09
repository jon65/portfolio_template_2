terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Optional: Configure remote state backend
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "portfolio-app/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Portfolio-App"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
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

# Security Group for EC2 Instance
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg"
  description = "Security group for ${var.app_name} application"
  vpc_id      = data.aws_vpc.default.id

  # HTTP access from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS access from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # Next.js dev server (for development/testing)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Next.js dev server"
  }

  # SSH access (restrict to your IP in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr_blocks
    description = "SSH"
  }

  # Outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.app_name}-sg"
  }
}

# IAM Role for EC2 Instance (for S3 access if needed)
resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-ec2-role"

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
    Name = "${var.app_name}-ec2-role"
  }
}

# IAM Policy for S3 access (if ORDER_STORAGE_TYPE=s3)
resource "aws_iam_role_policy" "s3_access" {
  count = var.enable_s3_access ? 1 : 0
  
  name = "${var.app_name}-s3-access"
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
  name = "${var.app_name}-ec2-profile"
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
  }))

  tags = {
    Name = var.app_name
  }
}

# Elastic IP (optional - uncomment if you want a static IP)
# resource "aws_eip" "app_eip" {
#   instance = aws_instance.app.id
#   domain   = "vpc"
#   
#   tags = {
#     Name = "${var.app_name}-eip"
#   }
# }

