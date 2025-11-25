output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.app.public_dns
}

output "instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = aws_instance.app.private_ip
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.app_sg.id
}

output "app_url" {
  description = "Application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_instance.app.public_dns}:3000"
}

output "domain_name" {
  description = "Domain name configured for the application"
  value       = var.domain_name != "" ? var.domain_name : "Not configured"
}

output "elastic_ip" {
  description = "Elastic IP address assigned to the EC2 instance (use this for Cloudflare DNS A record)"
  value       = aws_eip.app_eip.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.app_eip.public_ip}"
}

output "cloudflare_ipv4_ranges" {
  description = "Cloudflare IPv4 CIDR blocks used in security group"
  value       = local.cloudflare_ipv4_cidrs
}

output "cloudflare_ipv6_ranges" {
  description = "Cloudflare IPv6 CIDR blocks used in security group"
  value       = local.cloudflare_ipv6_cidrs
}

output "cloudflare_dns_setup_instructions" {
  description = "Instructions for setting up Cloudflare DNS"
  value = <<-EOT
    To complete the setup:
    
    1. Go to your Cloudflare dashboard
    2. Select your domain
    3. Go to DNS → Records
    4. Create an A record:
       - Name: ${var.domain_name != "" ? split(".", var.domain_name)[0] : "your-subdomain"}
       - IPv4 address: ${aws_eip.app_eip.public_ip}
       - Proxy status: Proxied (orange cloud) - IMPORTANT!
       - TTL: Auto
    
    5. Wait for DNS propagation (usually 1-5 minutes)
    6. Your site will be accessible at: https://${var.domain_name != "" ? var.domain_name : "your-domain.com"}
    
    IMPORTANT: Make sure the proxy status is enabled (orange cloud) in Cloudflare.
    This ensures traffic goes through Cloudflare and uses the IP ranges configured
    in the security group.
  EOT
}

