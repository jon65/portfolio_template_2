# Terraform Deployment: EC2 with Cloudflare DNS Security

This Terraform configuration deploys a Next.js application on AWS EC2 with security groups configured to **only allow ingress traffic from Cloudflare IP ranges**. This provides enhanced security by preventing direct access to your origin server.

## Key Features

- ✅ **Cloudflare-only ingress**: Security group restricts HTTP/HTTPS traffic to Cloudflare IP ranges only
- ✅ **Dynamic IP fetching**: Automatically fetches latest Cloudflare IP ranges from Cloudflare API
- ✅ **IPv4 and IPv6 support**: Configures both IPv4 and IPv6 Cloudflare IP ranges
- ✅ **Real visitor IPs**: Nginx configured to use `CF-Connecting-IP` header for accurate visitor IPs
- ✅ **Docker deployment**: Uses Docker and Docker Compose for containerized deployment
- ✅ **Nginx reverse proxy**: Configured with Cloudflare-specific headers and logging
- ✅ **Elastic IP**: Static IP address for Cloudflare DNS configuration

## Architecture

```
Internet → Cloudflare (Proxy) → EC2 Security Group (Cloudflare IPs only) → Nginx → Docker → Next.js App
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** (>= 1.0) installed
3. **AWS CLI** configured
4. **EC2 Key Pair** created in AWS
5. **Cloudflare Account** with domain added
6. **Domain** configured in Cloudflare

## Quick Start

### 1. Configure Variables

```bash
cd terraform-cloudflare
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review Plan

```bash
terraform plan
```

### 4. Deploy

```bash
terraform apply
```

### 5. Configure Cloudflare DNS

After deployment, get the Elastic IP:

```bash
terraform output elastic_ip
```

Then in Cloudflare Dashboard:
1. Go to DNS → Records
2. Create A record:
   - **Name**: Your subdomain (e.g., `shop`)
   - **IPv4 address**: The Elastic IP from above
   - **Proxy status**: **Proxied** (orange cloud) - **IMPORTANT!**
   - **TTL**: Auto

## Important Notes

### ⚠️ Cloudflare Proxy Must Be Enabled

**CRITICAL**: You must enable the Cloudflare proxy (orange cloud) in your DNS settings. If the proxy is disabled (grey cloud), traffic will bypass Cloudflare and be blocked by the security group.

### Security Group Rules

The security group is configured with:

- **Ingress (HTTP/HTTPS)**: Only from Cloudflare IP ranges (IPv4 and IPv6)
- **Ingress (SSH)**: From your specified CIDR blocks
- **Egress**: All traffic allowed (for API calls, database connections, etc.)

### Cloudflare IP Ranges

IP ranges are automatically fetched from:
- IPv4: `https://www.cloudflare.com/ips-v4`
- IPv6: `https://www.cloudflare.com/ips-v6`

These are updated dynamically on each `terraform apply`.

## Configuration

### Required Variables

- `key_pair_name`: AWS EC2 key pair name
- `database_url`: PostgreSQL connection string
- `stripe_publishable_key`: Stripe publishable key
- `stripe_secret_key`: Stripe secret key
- `resend_api_key`: Resend API key
- `admin_email`: Admin email address

### Optional Variables

- `domain_name`: Domain name for Nginx configuration
- `github_repo_url`: GitHub repository URL for automated deployment
- `enable_dev_port`: Enable port 3000 for development (default: false)

See `terraform.tfvars.example` for all available variables.

## Outputs

After deployment, Terraform outputs:

- `elastic_ip`: Use this for Cloudflare DNS A record
- `instance_public_ip`: EC2 instance public IP
- `ssh_command`: SSH command to connect to instance
- `cloudflare_ipv4_ranges`: List of Cloudflare IPv4 CIDR blocks
- `cloudflare_ipv6_ranges`: List of Cloudflare IPv6 CIDR blocks
- `cloudflare_dns_setup_instructions`: Step-by-step DNS setup guide

## Accessing the Application

### Via Cloudflare (Recommended)

Once DNS is configured:
```
https://yourdomain.com
```

### Direct Access (For Testing)

Direct access to the EC2 instance will be **blocked** by the security group unless:
1. You're accessing from a Cloudflare IP (unlikely)
2. You temporarily modify the security group

For testing, you can SSH into the instance and test locally:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@$(terraform output -raw elastic_ip)
curl http://localhost:3000
```

## Nginx Configuration

Nginx is configured with:

- **Real IP detection**: Uses `CF-Connecting-IP` header
- **Cloudflare headers**: Preserves all Cloudflare headers
- **Logging**: Custom log format with Cloudflare information

Log format includes:
- Real visitor IP (`cf_ip`)
- Cloudflare Ray ID (`cf_ray`)
- Visitor country (`cf_country`)

## Troubleshooting

### Application Not Accessible

1. **Check Cloudflare proxy is enabled** (orange cloud in DNS settings)
2. **Verify DNS propagation**: `dig yourdomain.com`
3. **Check security group**: Ensure Cloudflare IPs are allowed
4. **Check application logs**: `sudo docker-compose logs app`

### Direct Access Blocked

This is expected! Direct access is blocked by design. Access should only be through Cloudflare.

### Real Visitor IPs Not Showing

Ensure Nginx configuration includes:
- `real_ip_header CF-Connecting-IP;`
- Cloudflare IP ranges in `set_real_ip_from`

The user-data script configures this automatically.

## Updating Cloudflare IP Ranges

Cloudflare IP ranges are fetched automatically on each `terraform apply`. To manually update:

```bash
terraform apply -refresh=true
```

## Security Considerations

1. **SSH Access**: Restrict `allowed_ssh_cidr_blocks` to your IP
2. **Cloudflare Proxy**: Always enable proxy (orange cloud) in DNS
3. **Regular Updates**: Keep Cloudflare IP ranges updated
4. **Monitoring**: Monitor security group for unauthorized access attempts

## Cost

Estimated monthly costs (us-east-1):
- **t3.medium**: ~$30/month
- **EBS Storage (20GB)**: ~$2/month
- **Elastic IP**: Free (if attached to running instance)
- **Data Transfer**: ~$0.09/GB after free tier

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete the EC2 instance and all data!

## Additional Resources

- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [Cloudflare Real IP Headers](https://developers.cloudflare.com/fundamentals/get-started/reference/http-request-headers/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## Support

For issues:
1. Check Cloudflare proxy status
2. Verify security group rules
3. Review application logs
4. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

