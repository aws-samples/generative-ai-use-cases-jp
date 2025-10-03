#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script to encode and upload cdk.json to GitHub Secrets

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] <cdk-json-path>

Upload CDK configuration to GitHub Secrets as base64-encoded string.

Arguments:
    <cdk-json-path>     Path to cdk.json file (default: packages/cdk/cdk.json)

Options:
    -h, --help          Show this help message
    -o, --output        Output base64 string to stdout instead of uploading
    -s, --secret-name   GitHub secret name (default: CDK_CONFIG_BASE64)

Examples:
    # Upload cdk.json from default location
    $0

    # Upload custom cdk.json file
    $0 /path/to/custom-cdk.json

    # Output base64 without uploading
    $0 --output

    # Use custom secret name
    $0 --secret-name MY_CDK_CONFIG

Requirements:
    - GitHub CLI (gh) must be installed and authenticated
    - base64 command must be available

EOF
}

# Default values
CDK_JSON_PATH="packages/cdk/cdk.json"
SECRET_NAME="CDK_CONFIG_BASE64"
OUTPUT_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_usage
            exit 0
            ;;
        -o|--output)
            OUTPUT_ONLY=true
            shift
            ;;
        -s|--secret-name)
            SECRET_NAME="$2"
            shift 2
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_usage
            exit 1
            ;;
        *)
            CDK_JSON_PATH="$1"
            shift
            ;;
    esac
done

# Check if cdk.json exists
if [[ ! -f "$CDK_JSON_PATH" ]]; then
    echo -e "${RED}Error: File not found: $CDK_JSON_PATH${NC}"
    exit 1
fi

# Check if gh is installed (only if not output-only mode)
if [[ "$OUTPUT_ONLY" == false ]] && ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if base64 is available
if ! command -v base64 &> /dev/null; then
    echo -e "${RED}Error: base64 command not found${NC}"
    exit 1
fi

# Validate JSON syntax
if ! jq empty "$CDK_JSON_PATH" 2>/dev/null; then
    echo -e "${YELLOW}Warning: Could not validate JSON syntax (jq not installed or invalid JSON)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Encode to base64
echo -e "${GREEN}Encoding $CDK_JSON_PATH to base64...${NC}"
BASE64_CONTENT=$(base64 -w 0 < "$CDK_JSON_PATH")

if [[ -z "$BASE64_CONTENT" ]]; then
    echo -e "${RED}Error: Failed to encode file${NC}"
    exit 1
fi

# Output mode
if [[ "$OUTPUT_ONLY" == true ]]; then
    echo "$BASE64_CONTENT"
    exit 0
fi

# Check GitHub CLI authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI is not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [[ -z "$REPO" ]]; then
    echo -e "${RED}Error: Not in a GitHub repository or could not detect repository${NC}"
    exit 1
fi

echo -e "${GREEN}Repository: $REPO${NC}"
echo -e "${YELLOW}Secret name: $SECRET_NAME${NC}"

# Confirm upload
read -p "Upload base64-encoded cdk.json to GitHub Secrets? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Upload to GitHub Secrets
echo -e "${GREEN}Uploading to GitHub Secrets...${NC}"
echo "$BASE64_CONTENT" | gh secret set "$SECRET_NAME" -R "$REPO"

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Successfully uploaded $SECRET_NAME to $REPO${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Ensure AWS_DEPLOY_ROLE_ARN is set in GitHub Variables"
    echo "2. Ensure AWS_DEFAULT_REGION is set in GitHub Variables"
    echo "3. Push to main branch or create a tag to trigger deployment"
else
    echo -e "${RED}✗ Failed to upload secret${NC}"
    exit 1
fi
