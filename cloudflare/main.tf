terraform {
  required_version = ">= 1.0"
  
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Cloudflare Provider Configuration
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# AWS Provider Configuration (to get EC2 Elastic IP)
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

# Data source to get Cloudflare zone for yippies.net
data "cloudflare_zone" "main" {
  name = var.cloudflare_zone_name
}

# Data source to get EC2 instance by tags or instance ID
# This assumes the EC2 instance was created by the main terraform configuration
data "aws_instance" "app" {
  count = var.ec2_instance_id != "" ? 1 : 0
  instance_id = var.ec2_instance_id
}

# Alternative: Get Elastic IP directly if you know the allocation ID
data "aws_eip" "app_eip" {
  count = var.ec2_eip_allocation_id != "" ? 1 : 0
  id    = var.ec2_eip_allocation_id
}

# Get Elastic IP by public IP address (alternative method)
data "aws_eip" "app_eip_by_ip" {
  count = var.ec2_public_ip != "" && var.ec2_eip_allocation_id == "" ? 1 : 0
  public_ip = var.ec2_public_ip
}

# Determine the Elastic IP to use
locals {
  # Priority: allocation_id > public_ip > instance_id > override
  # Use try() to handle cases where data sources might not be available
  eip_from_allocation = var.ec2_eip_allocation_id != "" ? try(data.aws_eip.app_eip[0].public_ip, null) : null
  eip_from_public_ip  = var.ec2_public_ip != "" && var.ec2_eip_allocation_id == "" ? try(data.aws_eip.app_eip_by_ip[0].public_ip, var.ec2_public_ip) : null
  eip_from_instance   = var.ec2_instance_id != "" && var.ec2_eip_allocation_id == "" && var.ec2_public_ip == "" ? try(data.aws_instance.app[0].public_ip, null) : null
  
  eip_address = coalesce(
    local.eip_from_allocation,
    local.eip_from_public_ip,
    local.eip_from_instance,
    var.ec2_public_ip_override
  )
}

# Cloudflare DNS A record pointing root domain to EC2 Elastic IP
resource "cloudflare_record" "root" {
  zone_id = data.cloudflare_zone.main.id
  name    = var.domain_name == var.cloudflare_zone_name ? "@" : split(".${var.cloudflare_zone_name}", var.domain_name)[0]
  value   = local.eip_address
  type    = "A"
  ttl     = var.dns_ttl
  proxied = var.cloudflare_proxy_enabled  # Enable Cloudflare proxy (orange cloud) for DDoS protection and CDN
  comment = "A record for ${var.domain_name} pointing to EC2 instance"
}

# Cloudflare DNS A record for www subdomain (optional)
resource "cloudflare_record" "www" {
  count   = var.create_www_record ? 1 : 0
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  value   = local.eip_address
  type    = "A"
  ttl     = var.dns_ttl
  proxied = var.cloudflare_proxy_enabled
  comment = "A record for www.${var.cloudflare_zone_name} pointing to EC2 instance"
}

# Cloudflare Page Rules (optional) - Redirect www to non-www or vice versa
resource "cloudflare_page_rule" "www_redirect" {
  count    = var.create_www_record && var.redirect_www_to_root ? 1 : 0
  zone_id  = data.cloudflare_zone.main.id
  target   = "www.${var.cloudflare_zone_name}/*"
  priority = 1
  status   = "active"

  actions {
    forwarding_url {
      url         = "https://${var.cloudflare_zone_name}/$1"
      status_code = 301
    }
  }
}

# Cloudflare SSL/TLS Settings
resource "cloudflare_zone_settings_override" "ssl" {
  zone_id = data.cloudflare_zone.main.id

  settings {
    ssl = var.ssl_mode  # Options: "off", "flexible", "full", "full_strict"
    # "flexible" = SSL between visitor and Cloudflare only (use if EC2 doesn't have SSL)
    # "full" = SSL end-to-end, but Cloudflare won't verify origin certificate
    # "full_strict" = SSL end-to-end with valid origin certificate (recommended)
    
    min_tls_version = var.min_tls_version  # "1.0", "1.1", "1.2", "1.3"
    
    # Always Use HTTPS
    always_use_https = var.always_use_https ? "on" : "off"
    
    # Automatic HTTPS Rewrites
    automatic_https_rewrites = var.automatic_https_rewrites ? "on" : "off"
  }
}

# Cloudflare Speed Settings (optional optimizations)
resource "cloudflare_zone_settings_override" "speed" {
  count = var.enable_speed_optimizations ? 1 : 0
  zone_id = data.cloudflare_zone.main.id

  settings {
    # Brotli compression
    brotli = "on"
    
    # HTTP/2
    http2 = "on"
    
    # HTTP/3 (QUIC)
    http3 = var.enable_http3 ? "on" : "off"
    
    # 0-RTT Connection Resumption
    zero_rtt = var.enable_zero_rtt ? "on" : "off"
  }
}

# Cloudflare Security Settings
resource "cloudflare_zone_settings_override" "security" {
  count = var.enable_security_settings ? 1 : 0
  zone_id = data.cloudflare_zone.main.id

  settings {
    # Security Level
    security_level = var.security_level  # "essentially_off", "low", "medium", "high", "under_attack"
    
    # Challenge Passage (how long to skip challenges after passing)
    challenge_passage = var.challenge_passage
    
    # Browser Integrity Check
    browser_check = var.browser_check ? "on" : "off"
    
    # Privacy Pass Support
    privacy_pass = var.privacy_pass ? "on" : "off"
  }
}

# Cloudflare Cache Settings
resource "cloudflare_zone_settings_override" "cache" {
  count = var.enable_cache_settings ? 1 : 0
  zone_id = data.cloudflare_zone.main.id

  settings {
    # Browser Cache TTL
    browser_cache_ttl = var.browser_cache_ttl
    
    # Cache Level
    cache_level = var.cache_level  # "aggressive", "basic", "simplified"
    
    # Development Mode (bypass cache)
    development_mode = var.development_mode ? "on" : "off"
  }
}

