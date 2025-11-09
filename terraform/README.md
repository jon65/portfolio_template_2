# Terraform AWS EC2 Deployment

This directory contains Terraform configuration files to deploy the Next.js portfolio application to AWS EC2.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   aws configure
   ```
3. **Terraform**: Install Terraform (>= 1.0)
   ```bash
   # macOS
   brew install terraform
   
   # Or download from https://www.terraform.io/downloads
   ```
4. **SSH Key Pair**: Create an EC2 Key Pair in AWS Console
   - Go to EC2 Console → Key Pairs → Create Key Pair
   - Save the `.pem` file securely
   - Note the key pair name for use in `terraform.tfvars`

## Quick Start

### 1. Configure Variables

Copy the example variables file and fill in your values:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual values. **Important**: Never commit `terraform.tfvars` to version control as it contains sensitive information.

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the Plan

```bash
terraform plan
```

This will show you what resources will be created. Review carefully.

### 4. Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted. This will create:
- Security groups
- IAM role and instance profile
- EC2 instance
- All necessary networking

### 5. Access Your Application

After deployment completes, Terraform will output:
- Instance public IP
- Application URL (typically `http://<public-ip>:3000`)
- SSH command to connect to the instance

You can also get these values anytime with:
```bash
terraform output
```

## Configuration Options

### Instance Types

Recommended instance types:
- **t3.small**: For development/testing (2 vCPU, 2 GB RAM)
- **t3.medium**: For production (2 vCPU, 4 GB RAM) - **Recommended**
- **t3.large**: For high traffic (2 vCPU, 8 GB RAM)

### Application Deployment Methods

#### Option 1: GitHub Repository (Recommended)

Set `github_repo_url` and `github_branch` in `terraform.tfvars`:
```hcl
github_repo_url = "https://github.com/username/repo.git"
github_branch   = "master"
```

The user data script will automatically clone and deploy your code.

#### Option 2: Manual Upload

1. Leave `github_repo_url` empty in `terraform.tfvars`
2. After instance is created, SSH into it:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
   ```
3. Upload your code using `scp` or `rsync`:
   ```bash
   scp -r -i ~/.ssh/your-key.pem ./ ec2-user@<instance-ip>:/home/ec2-user/portfolio-app/
   ```
4. SSH into the instance and run:
   ```bash
   cd /home/ec2-user/portfolio-app
   npm install
   npm run build
   pm2 restart ecosystem.config.js
   ```

### Environment Variables

All environment variables are automatically configured from `terraform.tfvars` and written to `.env.local` on the EC2 instance.

### Security Considerations

1. **SSH Access**: Restrict `allowed_ssh_cidr_blocks` to your IP address:
   ```hcl
   allowed_ssh_cidr_blocks = ["YOUR.IP.ADDRESS.HERE/32"]
   ```

2. **Key Pair**: Keep your `.pem` file secure and never commit it to version control.

3. **Environment Variables**: Use AWS Systems Manager Parameter Store or Secrets Manager for sensitive values in production.

4. **HTTPS**: Set up a load balancer with SSL certificate for HTTPS. See "Advanced Configuration" below.

## Application Management

### View Application Logs

SSH into the instance and use PM2:
```bash
pm2 logs portfolio-app
pm2 status
```

### Restart Application

```bash
pm2 restart portfolio-app
```

### Update Application

If using GitHub:
1. Push changes to your repository
2. SSH into instance:
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<instance-ip>
   ```
3. Pull latest changes:
   ```bash
   cd /home/ec2-user/portfolio-app
   git pull
   npm install
   npm run build
   pm2 restart portfolio-app
   ```

### Database Migrations

SSH into the instance and run:
```bash
cd /home/ec2-user/portfolio-app
npx prisma db push
# or
npx prisma migrate deploy
```

## Advanced Configuration

### Add Elastic IP

Uncomment the Elastic IP resource in `main.tf`:
```hcl
resource "aws_eip" "app_eip" {
  instance = aws_instance.app.id
  domain   = "vpc"
}
```

### Set Up HTTPS with Load Balancer

For production, you'll want to add:
1. Application Load Balancer (ALB)
2. SSL Certificate from AWS Certificate Manager
3. Route53 for DNS

This is beyond the scope of this basic setup but can be added to the Terraform configuration.

### Use Custom VPC

Modify `main.tf` to use a specific VPC instead of the default:
```hcl
data "aws_vpc" "custom" {
  id = "vpc-xxxxxxxxx"
}
```

### Remote State Backend

Uncomment and configure the backend in `main.tf`:
```hcl
backend "s3" {
  bucket = "your-terraform-state-bucket"
  key    = "portfolio-app/terraform.tfstate"
  region = "us-east-1"
}
```

## Troubleshooting

### Instance Not Starting

1. Check instance status in AWS Console
2. View instance logs:
   ```bash
   aws ec2 get-console-output --instance-id <instance-id>
   ```
3. Check user data script logs:
   ```bash
   ssh into instance
   cat /var/log/user-data.log
   ```

### Application Not Accessible

1. Check security group rules allow traffic on port 80/443/3000
2. Verify application is running:
   ```bash
   ssh into instance
   pm2 status
   curl http://localhost:3000
   ```
3. Check Nginx status:
   ```bash
   sudo systemctl status nginx
   ```

### Database Connection Issues

1. Verify `DATABASE_URL` is correct in `.env.local`
2. Check security group allows outbound connections
3. Verify database is accessible from EC2 instance

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

**Warning**: This will delete all resources created by Terraform, including the EC2 instance and all data on it.

## Cost Estimation

Approximate monthly costs (us-east-1):
- **t3.small**: ~$15/month
- **t3.medium**: ~$30/month
- **t3.large**: ~$60/month
- **EBS Storage (20GB)**: ~$2/month
- **Data Transfer**: Varies based on usage

Use AWS Pricing Calculator for accurate estimates: https://calculator.aws/

## Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

