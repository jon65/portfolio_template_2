# GitHub SSH Key Setup for EC2 Deployment

This guide explains how to set up SSH keys for cloning private GitHub repositories during EC2 instance creation.

## Overview

When deploying to EC2, the `user-data.sh` script needs to clone your private GitHub repository. To do this securely, you need to:

1. Generate an SSH key pair (or use an existing one)
2. Add the public key to your GitHub account
3. Provide the private key to Terraform (securely)

## Step 1: Generate SSH Key Pair

If you don't already have an SSH key for GitHub:

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/github_deploy_key

# Or use RSA if ed25519 is not supported
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/github_deploy_key
```

**Important**: 
- Use a descriptive name like `github_deploy_key` to distinguish it from other keys
- You can leave the passphrase empty for automated deployments (or use a passphrase and configure ssh-agent)

## Step 2: Add Public Key to GitHub

1. **Copy your public key**:
   ```bash
   cat ~/.ssh/github_deploy_key.pub
   ```

2. **Add to GitHub**:
   - Go to your GitHub repository
   - Click **Settings** → **Deploy keys** (for repository-specific access)
   - OR **Settings** → **SSH and GPG keys** (for account-wide access)
   - Click **New deploy key** or **New SSH key**
   - Paste your public key
   - Give it a title (e.g., "EC2 Deployment Key")
   - ✅ Check "Allow write access" if you need to push (usually not needed for deployment)
   - Click **Add key**

### Option A: Deploy Key (Repository-Specific)

**Recommended for production**: Limits access to a single repository.

1. Go to your repository on GitHub
2. Settings → Deploy keys → Add deploy key
3. Paste the public key
4. Title: "EC2 Production Deploy"
5. ✅ Allow write access (only if needed)
6. Add key

### Option B: SSH Key (Account-Wide)

Use if you need access to multiple repositories.

1. Go to GitHub → Settings → SSH and GPG keys
2. New SSH key
3. Paste the public key
4. Add SSH key

## Step 3: Test SSH Connection

Test that your SSH key works:

```bash
# Test connection
ssh -T -i ~/.ssh/github_deploy_key git@github.com

# You should see:
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

## Step 4: Add Private Key to Terraform

### Option 1: Direct in terraform.tfvars (Simple but less secure)

```hcl
github_ssh_private_key = <<-EOT
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAy... (your full private key)
-----END OPENSSH PRIVATE KEY-----
EOT
```

### Option 2: Read from File (More secure)

In `terraform.tfvars`:

```hcl
github_ssh_private_key = file("~/.ssh/github_deploy_key")
```

Or use a relative path:

```hcl
github_ssh_private_key = file("${path.module}/../secrets/github_deploy_key")
```

### Option 3: Environment Variable (Most secure)

1. **Set environment variable**:
   ```bash
   export TF_VAR_github_ssh_private_key="$(cat ~/.ssh/github_deploy_key)"
   ```

2. **In terraform.tfvars**, leave it empty or use a placeholder:
   ```hcl
   github_ssh_private_key = ""  # Will be read from TF_VAR_github_ssh_private_key
   ```

3. **Run Terraform**:
   ```bash
   terraform apply
   ```

### Option 4: AWS Systems Manager Parameter Store (Recommended for Production)

Store the key in AWS SSM Parameter Store:

```bash
# Store the key
aws ssm put-parameter \
    --name "/portfolio-app/github-ssh-key" \
    --value "$(cat ~/.ssh/github_deploy_key)" \
    --type "SecureString" \
    --region us-east-1
```

Then in Terraform, use a data source:

```hcl
data "aws_ssm_parameter" "github_ssh_key" {
  name = "/portfolio-app/github-ssh-key"
}

# In main.tf user_data template:
github_ssh_private_key = data.aws_ssm_parameter.github_ssh_key.value
```

## Step 5: Configure terraform.tfvars

Update your `terraform.tfvars`:

```hcl
# GitHub Configuration
github_repo_url = "git@github.com:yourusername/yourrepo.git"  # Use SSH URL
# OR
github_repo_url = "https://github.com/yourusername/yourrepo.git"  # HTTPS URL (will be converted to SSH)

github_branch = "master"

# SSH Private Key (choose one method from above)
github_ssh_private_key = file("~/.ssh/github_deploy_key")
```

## Security Best Practices

1. **Use Deploy Keys**: Prefer repository-specific deploy keys over account-wide SSH keys
2. **Restrict Access**: Only grant read access unless you need to push
3. **Rotate Keys**: Regularly rotate SSH keys
4. **Use SSM Parameter Store**: For production, store keys in AWS Systems Manager Parameter Store
5. **Never Commit Keys**: Never commit private keys to version control
6. **Use .gitignore**: Ensure `terraform.tfvars` is in `.gitignore`

## Troubleshooting

### SSH Key Not Working

1. **Check key format**:
   ```bash
   # Verify the key file
   cat ~/.ssh/github_deploy_key
   # Should start with -----BEGIN and end with -----END
   ```

2. **Check permissions**:
   ```bash
   chmod 600 ~/.ssh/github_deploy_key
   ```

3. **Test connection manually**:
   ```bash
   ssh -T -i ~/.ssh/github_deploy_key git@github.com
   ```

4. **Check GitHub deploy key**:
   - Verify the public key is added to GitHub
   - Check if it's enabled
   - Verify repository access

### Clone Fails in user-data.sh

1. **Check user-data logs**:
   ```bash
   ssh into EC2 instance
   sudo cat /var/log/cloud-init-output.log | grep -i "clone\|ssh\|git"
   ```

2. **Verify SSH key was written**:
   ```bash
   cat ~/.ssh/id_rsa
   ls -la ~/.ssh/
   ```

3. **Test SSH connection from EC2**:
   ```bash
   ssh -T git@github.com
   ```

### HTTPS URL Conversion

The script automatically converts HTTPS URLs to SSH URLs:
- `https://github.com/user/repo.git` → `git@github.com:user/repo.git`

If you're using GitHub Enterprise or a custom domain, the script handles that too.

## Example: Complete terraform.tfvars

```hcl
# ... other variables ...

# GitHub Configuration
github_repo_url = "https://github.com/yourusername/portfolio_template_2.git"
github_branch   = "master"

# SSH Private Key (using file method)
github_ssh_private_key = file("${path.module}/../secrets/github_deploy_key")

# Or using heredoc (less secure)
# github_ssh_private_key = <<-EOT
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... your key ...
# -----END OPENSSH PRIVATE KEY-----
# EOT
```

## Additional Resources

- [GitHub Deploy Keys Documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [GitHub SSH Key Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)

