#!/bin/bash
# Helper script to get EC2 instance information for Cloudflare DNS setup

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}EC2 Information Helper${NC}"
echo "=========================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}Warning: AWS CLI is not installed${NC}"
    echo "Install from: https://aws.amazon.com/cli/"
    echo ""
    echo "You can manually provide EC2 information in terraform.tfvars:"
    echo "  - ec2_instance_id"
    echo "  - ec2_eip_allocation_id"
    echo "  - ec2_public_ip"
    exit 0
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${YELLOW}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo "Fetching EC2 instances..."
echo ""

# Get all running EC2 instances
INSTANCES=$(aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,PrivateIpAddress,Tags[?Key==`Name`].Value|[0]]' \
    --output table)

if [ -z "$INSTANCES" ]; then
    echo -e "${YELLOW}No running EC2 instances found${NC}"
    exit 0
fi

echo "$INSTANCES"
echo ""

# Ask user to select instance
echo -e "${BLUE}Enter the Instance ID you want to use:${NC}"
read -r INSTANCE_ID

if [ -z "$INSTANCE_ID" ]; then
    echo "No instance ID provided"
    exit 1
fi

# Get detailed information about the selected instance
echo ""
echo -e "${GREEN}Fetching details for instance: $INSTANCE_ID${NC}"
echo ""

# Get instance details
INSTANCE_INFO=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0]' \
    --output json)

# Extract information
PUBLIC_IP=$(echo "$INSTANCE_INFO" | jq -r '.PublicIpAddress // "N/A"')
PRIVATE_IP=$(echo "$INSTANCE_INFO" | jq -r '.PrivateIpAddress // "N/A"')
INSTANCE_TYPE=$(echo "$INSTANCE_INFO" | jq -r '.InstanceType // "N/A"')
INSTANCE_NAME=$(echo "$INSTANCE_INFO" | jq -r '.Tags[]? | select(.Key=="Name") | .Value // "N/A"')

# Get Elastic IP information
EIP_INFO=$(aws ec2 describe-addresses \
    --filters "Name=instance-id,Values=$INSTANCE_ID" \
    --query 'Addresses[0]' \
    --output json 2>/dev/null || echo "{}")

EIP_ALLOCATION_ID=$(echo "$EIP_INFO" | jq -r '.AllocationId // "N/A"')
EIP_PUBLIC_IP=$(echo "$EIP_INFO" | jq -r '.PublicIp // "N/A"')

echo "=========================="
echo -e "${GREEN}Instance Information:${NC}"
echo "=========================="
echo "Instance ID:      $INSTANCE_ID"
echo "Instance Name:    $INSTANCE_NAME"
echo "Instance Type:    $INSTANCE_TYPE"
echo "Public IP:        $PUBLIC_IP"
echo "Private IP:       $PRIVATE_IP"
echo ""
echo "=========================="
echo -e "${GREEN}Elastic IP Information:${NC}"
echo "=========================="
echo "Allocation ID:    $EIP_ALLOCATION_ID"
echo "Public IP:        $EIP_PUBLIC_IP"
echo ""

# Generate terraform.tfvars snippet
echo "=========================="
echo -e "${GREEN}Add this to your terraform.tfvars:${NC}"
echo "=========================="
echo ""

if [ "$EIP_ALLOCATION_ID" != "N/A" ] && [ "$EIP_ALLOCATION_ID" != "null" ]; then
    echo "# Option 1: Use Elastic IP Allocation ID (recommended)"
    echo "ec2_eip_allocation_id = \"$EIP_ALLOCATION_ID\""
    echo ""
fi

if [ "$EIP_PUBLIC_IP" != "N/A" ] && [ "$EIP_PUBLIC_IP" != "null" ]; then
    echo "# Option 2: Use Elastic IP Public Address"
    echo "ec2_public_ip = \"$EIP_PUBLIC_IP\""
    echo ""
fi

echo "# Option 3: Use Instance ID (Terraform will auto-detect Elastic IP)"
echo "ec2_instance_id = \"$INSTANCE_ID\""
echo ""

echo -e "${BLUE}Note: You only need to provide ONE of the above options.${NC}"

