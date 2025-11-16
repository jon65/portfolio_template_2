variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "portfolio-app"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"  # t3.small for smaller apps, t3.medium recommended for Next.js
}

variable "volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 20
}

variable "volume_type" {
  description = "Root volume type"
  type        = string
  default     = "gp3"
}

variable "key_pair_name" {
  description = "Name of the AWS key pair for SSH access"
  type        = string
}

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into the instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production!
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "enable_s3_access" {
  description = "Enable S3 access for order storage"
  type        = bool
  default     = false
}

variable "s3_bucket_name" {
  description = "S3 bucket name for order storage (if enable_s3_access is true)"
  type        = string
  default     = ""
}

# Application Environment Variables
variable "node_version" {
  description = "Node.js version to install"
  type        = string
  default     = "20"
}

variable "database_url" {
  description = "PostgreSQL database connection URL"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type      = string
  sensitive = true
  default   = ""
}

variable "resend_api_key" {
  description = "Resend API key for emails"
  type        = string
  sensitive   = true
}

variable "resend_from_email" {
  description = "Resend from email address"
  type        = string
  default     = "Your Brand <noreply@yourdomain.com>"
}

variable "admin_email" {
  description = "Admin email for notifications"
  type        = string
}

variable "admin_panel_api_url" {
  description = "External admin panel API URL (optional)"
  type        = string
  default     = ""
}

variable "admin_panel_api_key" {
  description = "External admin panel API key (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "internal_api_key" {
  description = "Internal API key (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_api_key" {
  description = "Admin API key for retrieving orders"
  type        = string
  sensitive   = true
  default     = ""
}

variable "app_url" {
  description = "Application URL (e.g., https://yourdomain.com)"
  type        = string
  default     = ""
}

variable "order_storage_type" {
  description = "Order storage type: internal, s3, or database"
  type        = string
  default     = "internal"
}

variable "aws_access_key_id" {
  description = "AWS access key ID (if using S3 storage)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_secret_access_key" {
  description = "AWS secret access key (if using S3 storage)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_s3_bucket" {
  description = "AWS S3 bucket name (if using S3 storage)"
  type        = string
  default     = ""
}

variable "aws_s3_region" {
  description = "AWS S3 region (if using S3 storage)"
  type        = string
  default     = "us-east-1"
}

variable "database_api_url" {
  description = "Database API URL (if using database storage)"
  type        = string
  default     = ""
}

variable "database_api_key" {
  description = "Database API key (if using database storage)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_test_mode" {
  description = "Enable Stripe test mode"
  type        = bool
  default     = false
}

variable "github_repo_url" {
  description = "GitHub repository URL (optional - for automated deployments)"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "master"
}

variable "github_ssh_private_key" {
  description = "SSH private key for accessing private GitHub repository (base64 encoded or plain text)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_actions_ssh_public_key" {
  description = "SSH public key for GitHub Actions to access EC2 instance (for CI/CD deployments)"
  type        = string
  sensitive   = false
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application (e.g., shop.jonnoyip.com)"
  type        = string
  default     = ""
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = false
  default     = ""
}

variable "supabase_publishable_key" {
  description = "Supabase publishable/anonymous key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_service_role_key" {
  description = "Supabase service role key (for server-side operations)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_product_images_bucket" {
  description = "Supabase storage bucket name for product images"
  type        = string
  default     = "product-images"
}

variable "use_supabase_images" {
  description = "Enable Supabase image URL enrichment (true/false)"
  type        = string
  default     = "false"
}

variable "supabase_use_public_images" {
  description = "Use public image URLs instead of signed URLs (true/false)"
  type        = string
  default     = "false"
}

