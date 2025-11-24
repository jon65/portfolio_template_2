#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cloudflare DNS Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}Warning: terraform.tfvars not found${NC}"
    echo -e "${YELLOW}Creating from terraform.tfvars.example...${NC}"
    if [ -f "terraform.tfvars.example" ]; then
        cp terraform.tfvars.example terraform.tfvars
        echo -e "${GREEN}Created terraform.tfvars. Please edit it with your values before running again.${NC}"
        exit 1
    else
        echo -e "${RED}Error: terraform.tfvars.example not found${NC}"
        exit 1
    fi
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform is not installed${NC}"
    echo "Install from: https://www.terraform.io/downloads"
    exit 1
fi

# Check if AWS CLI is installed (for getting EC2 info)
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}Warning: AWS CLI is not installed${NC}"
    echo -e "${YELLOW}You may need to manually provide EC2 instance ID or Elastic IP${NC}"
fi

# Initialize Terraform
echo -e "${BLUE}Initializing Terraform...${NC}"
terraform init

# Validate Terraform configuration
echo -e "${BLUE}Validating Terraform configuration...${NC}"
if ! terraform validate; then
    echo -e "${RED}Error: Terraform validation failed${NC}"
    exit 1
fi

# Show plan
echo -e "${BLUE}Generating Terraform plan...${NC}"
terraform plan

# Ask for confirmation
echo ""
echo -e "${YELLOW}Do you want to apply these changes? (yes/no)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Apply changes
echo -e "${BLUE}Applying Terraform configuration...${NC}"
terraform apply -auto-approve

# Show outputs
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
terraform output

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Wait for DNS propagation (usually 5-30 minutes)"
echo "2. Test your site: curl -I https://$(terraform output -raw domain_url | sed 's|https://||')"
echo "3. Check DNS propagation: dig $(terraform output -raw domain_url | sed 's|https://||')"
echo "4. Monitor Cloudflare dashboard for analytics and logs"
echo ""

