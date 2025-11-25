#!/bin/bash
# Script to verify Terraform provider credentials (AWS and Cloudflare)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Terraform Credentials Checker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================================================
# AWS Credentials Check
# ============================================================================
echo -e "${BLUE}Checking AWS Credentials...${NC}"
echo ""

if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠ AWS CLI is not installed${NC}"
    echo "   Install from: https://aws.amazon.com/cli/"
    echo ""
else
    # Check if AWS credentials are configured
    if aws sts get-caller-identity &> /dev/null; then
        echo -e "${GREEN}✓ AWS credentials are configured${NC}"
        
        # Get AWS account info
        AWS_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)
        AWS_USER=$(aws sts get-caller-identity --query 'Arn' --output text)
        AWS_REGION=$(aws configure get region || echo "not set")
        
        echo "   Account ID: $AWS_ACCOUNT"
        echo "   User/Role:  $AWS_USER"
        echo "   Region:     $AWS_REGION"
        echo ""
        
        # Check if credentials have EC2 permissions
        echo "   Testing EC2 permissions..."
        if aws ec2 describe-instances --max-items 1 &> /dev/null; then
            echo -e "${GREEN}   ✓ EC2 read permissions: OK${NC}"
        else
            echo -e "${RED}   ✗ EC2 read permissions: FAILED${NC}"
            echo "     You may not have permission to read EC2 instances"
        fi
        echo ""
    else
        echo -e "${RED}✗ AWS credentials are NOT configured or invalid${NC}"
        echo ""
        echo "   To configure AWS credentials:"
        echo "   1. Run: aws configure"
        echo "   2. Enter your AWS Access Key ID"
        echo "   3. Enter your AWS Secret Access Key"
        echo "   4. Enter your default region (e.g., us-east-1)"
        echo "   5. Enter output format (json is recommended)"
        echo ""
        echo "   Or set environment variables:"
        echo "   export AWS_ACCESS_KEY_ID=your_access_key"
        echo "   export AWS_SECRET_ACCESS_KEY=your_secret_key"
        echo "   export AWS_DEFAULT_REGION=us-east-1"
        echo ""
    fi
fi

# ============================================================================
# Cloudflare Credentials Check
# ============================================================================
echo -e "${BLUE}Checking Cloudflare Credentials...${NC}"
echo ""

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}⚠ terraform.tfvars not found${NC}"
    echo "   Create it from terraform.tfvars.example"
    echo "   Make sure to set: cloudflare_api_token"
    echo ""
else
    # Try to extract Cloudflare API token (basic check)
    if grep -q "cloudflare_api_token" terraform.tfvars; then
        TOKEN_LINE=$(grep "cloudflare_api_token" terraform.tfvars | head -1)
        if echo "$TOKEN_LINE" | grep -q "your_cloudflare_api_token_here\|example\|placeholder"; then
            echo -e "${RED}✗ Cloudflare API token appears to be a placeholder${NC}"
            echo "   Please update terraform.tfvars with your actual API token"
        else
            echo -e "${GREEN}✓ Cloudflare API token is set in terraform.tfvars${NC}"
            
            # Try to validate the token by making a test API call
            if command -v curl &> /dev/null; then
                TOKEN=$(grep "cloudflare_api_token" terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)".*/\1/' | tr -d ' ')
                if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "your_cloudflare_api_token_here" ]; then
                    echo "   Validating API token..."
                    RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
                        -H "Authorization: Bearer $TOKEN" \
                        -H "Content-Type: application/json" 2>/dev/null || echo "error")
                    
                    if echo "$RESPONSE" | grep -q '"success":true'; then
                        echo -e "${GREEN}   ✓ Cloudflare API token is valid${NC}"
                        
                        # Get zone name from tfvars
                        ZONE_NAME=$(grep "cloudflare_zone_name" terraform.tfvars | head -1 | sed 's/.*= *"\(.*\)".*/\1/' | tr -d ' ')
                        if [ ! -z "$ZONE_NAME" ]; then
                            echo "   Testing zone access for: $ZONE_NAME"
                            ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
                                -H "Authorization: Bearer $TOKEN" \
                                -H "Content-Type: application/json" 2>/dev/null || echo "error")
                            
                            if echo "$ZONE_RESPONSE" | grep -q '"success":true'; then
                                echo -e "${GREEN}   ✓ Zone access: OK${NC}"
                            else
                                echo -e "${YELLOW}   ⚠ Zone access: Check if zone exists or token has permissions${NC}"
                            fi
                        fi
                    elif echo "$RESPONSE" | grep -q "error\|Invalid"; then
                        echo -e "${RED}   ✗ Cloudflare API token is invalid or expired${NC}"
                    else
                        echo -e "${YELLOW}   ⚠ Could not validate token (network issue?)${NC}"
                    fi
                fi
            fi
        fi
    else
        echo -e "${RED}✗ cloudflare_api_token not found in terraform.tfvars${NC}"
        echo "   Please add: cloudflare_api_token = \"your_token_here\""
    fi
    echo ""
fi

# ============================================================================
# Terraform Check
# ============================================================================
echo -e "${BLUE}Checking Terraform...${NC}"
echo ""

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}✗ Terraform is not installed${NC}"
    echo "   Install from: https://www.terraform.io/downloads"
    echo ""
else
    TERRAFORM_VERSION=$(terraform version -json | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4 || terraform version | head -1)
    echo -e "${GREEN}✓ Terraform is installed${NC}"
    echo "   Version: $TERRAFORM_VERSION"
    echo ""
    
    # Check if terraform is initialized
    if [ -d ".terraform" ]; then
        echo -e "${GREEN}✓ Terraform is initialized${NC}"
    else
        echo -e "${YELLOW}⚠ Terraform not initialized${NC}"
        echo "   Run: terraform init"
    fi
    echo ""
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "To check credentials manually:"
echo ""
echo "AWS:"
echo "  aws sts get-caller-identity"
echo "  aws ec2 describe-instances --max-items 1"
echo ""
echo "Cloudflare:"
echo "  curl -X GET 'https://api.cloudflare.com/client/v4/user/tokens/verify' \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -H 'Content-Type: application/json'"
echo ""
echo "Terraform:"
echo "  terraform init"
echo "  terraform validate"
echo "  terraform plan"
echo ""

