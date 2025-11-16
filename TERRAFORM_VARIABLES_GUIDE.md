# Where to Add Terraform Variables

## Quick Answer

Create a file called `terraform.tfvars` in the `terraform/` directory and add all your variables there.

## Step-by-Step Instructions

### 1. Navigate to Terraform Directory

```bash
cd terraform
```

### 2. Copy the Example File

```bash
cp terraform.tfvars.example terraform.tfvars
```

### 3. Edit terraform.tfvars

Open `terraform/terraform.tfvars` in your editor and fill in your actual values.

**File Location:**
```
terraform/
  ├── terraform.tfvars          ← ADD YOUR VARIABLES HERE
  ├── terraform.tfvars.example  ← Example template (don't edit this)
  ├── variables.tf              ← Variable definitions (don't edit this)
  ├── main.tf
  └── ...
```

## Important Notes

### ⚠️ Security Warning

**NEVER commit `terraform.tfvars` to version control!**

The file contains sensitive information like:
- Database passwords
- API keys
- SSH private keys
- Stripe secrets

Make sure `terraform.tfvars` is in your `.gitignore`:

```bash
# Add to .gitignore
echo "terraform/terraform.tfvars" >> .gitignore
```

### File Structure

```
terraform/
├── terraform.tfvars          # Your actual values (NOT in git)
├── terraform.tfvars.example  # Template (safe to commit)
├── variables.tf              # Variable definitions
└── main.tf                   # Uses variables from terraform.tfvars
```

## Example terraform.tfvars

Here's what your `terraform.tfvars` should look like:

```hcl
# AWS Configuration
aws_region     = "us-east-1"
environment    = "production"
app_name       = "portfolio-app"
instance_type  = "t3.medium"
volume_size    = 20
key_pair_name  = "my-ec2-key-pair"  # Your EC2 key pair name

# Security - IMPORTANT: Restrict to your IP!
allowed_ssh_cidr_blocks = ["YOUR.IP.ADDRESS.HERE/32"]

# Node.js Configuration
node_version = "20"

# Database Configuration (Supabase)
database_url = "postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Stripe Configuration
stripe_publishable_key = "pk_live_your_key_here"
stripe_secret_key      = "sk_live_your_key_here"
stripe_webhook_secret  = "whsec_your_secret_here"
stripe_test_mode       = false

# Email Configuration (Resend)
resend_api_key    = "re_your_key_here"
resend_from_email = "Shop <noreply@shop.jonnoyip.com>"

# Admin Configuration
admin_email = "admin@shop.jonnoyip.com"

# Application URL
app_url = "https://shop.jonnoyip.com"

# Domain Configuration
domain_name = "shop.jonnoyip.com"

# GitHub Configuration
github_repo_url = "https://github.com/yourusername/yourrepo.git"
github_branch   = "prod"

# SSH Private Key for Private GitHub Repository
github_ssh_private_key = file("~/.ssh/github_deploy_key")
# OR use heredoc:
# github_ssh_private_key = <<-EOT
#   -----BEGIN OPENSSH PRIVATE KEY-----
#   ...
#   -----END OPENSSH PRIVATE KEY-----
# EOT

# SSH Public Key for GitHub Actions CI/CD
github_actions_ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions@deploy"

# Supabase Configuration
supabase_url                  = "https://your-project.supabase.co"
supabase_publishable_key      = "your_supabase_publishable_key"
supabase_service_role_key     = "your_supabase_service_role_key"
supabase_product_images_bucket = "product-images"
use_supabase_images           = "true"
supabase_use_public_images    = "false"

# Order Storage Configuration
order_storage_type = "internal"
```

## Alternative: Environment Variables

You can also set variables using environment variables:

```bash
export TF_VAR_database_url="postgresql://..."
export TF_VAR_stripe_secret_key="sk_live_..."
# etc.
```

Then run:
```bash
terraform apply
```

## Alternative: Command Line

You can also pass variables directly:

```bash
terraform apply \
  -var="database_url=postgresql://..." \
  -var="stripe_secret_key=sk_live_..."
```

## Verify Your Variables

After creating `terraform.tfvars`, you can verify Terraform can read them:

```bash
cd terraform
terraform plan
```

This will show you what Terraform plans to create using your variables.

## Common Variables to Set

### Required Variables

1. **`key_pair_name`** - Your EC2 key pair name (must exist in AWS)
2. **`database_url`** - Your Supabase/PostgreSQL connection string
3. **`stripe_publishable_key`** - Your Stripe publishable key
4. **`stripe_secret_key`** - Your Stripe secret key
5. **`resend_api_key`** - Your Resend API key
6. **`admin_email`** - Your admin email address

### Optional but Recommended

1. **`github_repo_url`** - Your GitHub repository URL
2. **`github_ssh_private_key`** - SSH key for private repos
3. **`github_actions_ssh_public_key`** - For CI/CD automation
4. **`domain_name`** - Your domain (for SSL)
5. **`supabase_url`** - Your Supabase project URL
6. **`supabase_publishable_key`** - Supabase publishable key

## Troubleshooting

### "Variable not set" Error

If you get an error like:
```
Error: No value for required variable "database_url"
```

**Solution**: Make sure you've:
1. Created `terraform.tfvars` file
2. Added the variable with correct name
3. Are in the `terraform/` directory when running `terraform apply`

### "File not found" Error

If using `file()` function:
```hcl
github_ssh_private_key = file("~/.ssh/github_deploy_key")
```

**Solution**: Use absolute path or relative path from terraform directory:
```hcl
github_ssh_private_key = file("/Users/yourname/.ssh/github_deploy_key")
# OR
github_ssh_private_key = file("${path.module}/../secrets/github_deploy_key")
```

## Next Steps

1. ✅ Create `terraform/terraform.tfvars`
2. ✅ Fill in all your values
3. ✅ Verify it's in `.gitignore`
4. ✅ Run `terraform plan` to verify
5. ✅ Run `terraform apply` to deploy

## See Also

- `terraform/terraform.tfvars.example` - Complete example with all variables
- `terraform/variables.tf` - Variable definitions and descriptions
- `EC2_DEPLOYMENT_GUIDE.md` - Full deployment guide


