output "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  value       = data.cloudflare_zone.main.id
}

output "cloudflare_zone_name" {
  description = "Cloudflare zone name"
  value       = data.cloudflare_zone.main.name
}

output "dns_record_id" {
  description = "Cloudflare DNS A record ID for root domain"
  value       = cloudflare_record.root.id
}

output "dns_record_name" {
  description = "DNS record name"
  value       = cloudflare_record.root.name
}

output "dns_record_value" {
  description = "DNS record value (EC2 Elastic IP)"
  value       = cloudflare_record.root.value
}

output "dns_record_proxied" {
  description = "Whether DNS record is proxied through Cloudflare"
  value       = cloudflare_record.root.proxied
}

output "www_record_id" {
  description = "Cloudflare DNS A record ID for www subdomain (if created)"
  value       = var.create_www_record ? cloudflare_record.www[0].id : "Not created"
}

output "ec2_elastic_ip" {
  description = "EC2 Elastic IP address being used"
  value       = local.eip_address
}

output "domain_url" {
  description = "Full domain URL"
  value       = "https://${var.domain_name}"
}

output "ssl_mode" {
  description = "Cloudflare SSL mode configured"
  value       = var.ssl_mode
}

output "dns_propagation_info" {
  description = "Information about DNS propagation"
  value = <<-EOT
    DNS records have been created in Cloudflare.
    
    Domain: ${var.domain_name}
    Points to: ${local.eip_address}
    Proxied: ${var.cloudflare_proxy_enabled ? "Yes (orange cloud)" : "No (grey cloud)"}
    SSL Mode: ${var.ssl_mode}
    
    DNS propagation typically takes:
    - Cloudflare: Immediate (within seconds)
    - Global DNS: 5-30 minutes (usually faster)
    
    You can check DNS propagation with:
    - dig ${var.domain_name}
    - nslookup ${var.domain_name}
    - https://www.whatsmydns.net/#A/${var.domain_name}
    
    If proxied (orange cloud), your site will be accessible via Cloudflare's CDN
    and will have DDoS protection enabled automatically.
  EOT
}

output "next_steps" {
  description = "Next steps after deployment"
  value = <<-EOT
    Next Steps:
    
    1. Verify DNS propagation:
       dig ${var.domain_name}
    
    2. Test your site:
       curl -I https://${var.domain_name}
    
    3. If using SSL mode "flexible", ensure your EC2 instance accepts HTTP traffic
       on port 80 (Cloudflare will handle HTTPS termination)
    
    4. If using SSL mode "full" or "full_strict", ensure your EC2 instance has
       a valid SSL certificate and accepts HTTPS traffic on port 443
    
    5. Monitor Cloudflare analytics in the Cloudflare dashboard
    
    6. Configure additional Cloudflare features as needed:
       - Firewall rules
       - Rate limiting
       - Page rules
       - Workers (for edge computing)
  EOT
}

