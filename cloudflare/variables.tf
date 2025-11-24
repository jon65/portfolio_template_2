# Cloudflare Configuration
variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:Edit and Zone:Read permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_name" {
  description = "Cloudflare zone name (e.g., yippies.net)"
  type        = string
  default     = "yippies.net"
}

variable "domain_name" {
  description = "Domain name to create DNS record for (e.g., yippies.net or shop.yippies.net)"
  type        = string
  default     = "yippies.net"
}

variable "dns_ttl" {
  description = "TTL (Time To Live) for DNS records in seconds"
  type        = number
  default     = 1  # 1 = automatic (recommended when using Cloudflare proxy)
  
  # Note: When proxied (orange cloud), TTL is automatically set to "automatic"
  # For non-proxied records, use values like 300 (5 min), 3600 (1 hour), etc.
}

variable "cloudflare_proxy_enabled" {
  description = "Enable Cloudflare proxy (orange cloud) for DDoS protection and CDN. Set to false for direct connection to EC2."
  type        = bool
  default     = true
}

variable "create_www_record" {
  description = "Create www subdomain record"
  type        = bool
  default     = true
}

variable "redirect_www_to_root" {
  description = "Redirect www subdomain to root domain using Cloudflare Page Rules"
  type        = bool
  default     = false
}

# EC2 Instance Configuration
variable "aws_region" {
  description = "AWS region where EC2 instance is located"
  type        = string
  default     = "us-east-1"
}

variable "ec2_instance_id" {
  description = "EC2 instance ID (optional - used to automatically get Elastic IP)"
  type        = string
  default     = ""
}

variable "ec2_eip_allocation_id" {
  description = "Elastic IP allocation ID (optional - preferred method if known)"
  type        = string
  default     = ""
}

variable "ec2_public_ip" {
  description = "EC2 Elastic IP public address (optional - used if instance_id or allocation_id not provided)"
  type        = string
  default     = ""
}

variable "ec2_public_ip_override" {
  description = "Override: Manually specify EC2 public IP if data sources can't find it"
  type        = string
  default     = ""
}

# SSL/TLS Configuration
variable "ssl_mode" {
  description = "Cloudflare SSL mode: 'off', 'flexible', 'full', or 'full_strict'"
  type        = string
  default     = "flexible"
  
  # flexible = SSL between visitor and Cloudflare only (EC2 can use HTTP)
  # full = SSL end-to-end, but Cloudflare won't verify origin certificate
  # full_strict = SSL end-to-end with valid origin certificate (recommended for production)
}

variable "min_tls_version" {
  description = "Minimum TLS version: '1.0', '1.1', '1.2', or '1.3'"
  type        = string
  default     = "1.2"
}

variable "always_use_https" {
  description = "Automatically redirect HTTP to HTTPS"
  type        = bool
  default     = true
}

variable "automatic_https_rewrites" {
  description = "Automatically rewrite HTTP links to HTTPS"
  type        = bool
  default     = true
}

# Speed Optimizations
variable "enable_speed_optimizations" {
  description = "Enable Cloudflare speed optimizations"
  type        = bool
  default     = true
}

variable "enable_http3" {
  description = "Enable HTTP/3 (QUIC) protocol"
  type        = bool
  default     = true
}

variable "enable_zero_rtt" {
  description = "Enable 0-RTT Connection Resumption"
  type        = bool
  default     = false  # Set to true for better performance, but may have security implications
}

# Security Settings
variable "enable_security_settings" {
  description = "Enable Cloudflare security settings"
  type        = bool
  default     = true
}

variable "security_level" {
  description = "Cloudflare security level: 'essentially_off', 'low', 'medium', 'high', 'under_attack'"
  type        = string
  default     = "medium"
}

variable "challenge_passage" {
  description = "How long to skip challenges after passing (in seconds)"
  type        = number
  default     = 1800  # 30 minutes
}

variable "browser_check" {
  description = "Enable browser integrity check"
  type        = bool
  default     = true
}

variable "privacy_pass" {
  description = "Enable Privacy Pass support"
  type        = bool
  default     = true
}

# Cache Settings
variable "enable_cache_settings" {
  description = "Enable Cloudflare cache settings"
  type        = bool
  default     = true
}

variable "browser_cache_ttl" {
  description = "Browser cache TTL in seconds"
  type        = number
  default     = 14400  # 4 hours
}

variable "cache_level" {
  description = "Cache level: 'aggressive', 'basic', or 'simplified'"
  type        = string
  default     = "basic"
}

variable "development_mode" {
  description = "Enable development mode (bypasses cache - use for testing only)"
  type        = bool
  default     = false
}

# General
variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "production"
}

