#!/bin/bash
set -e

#############################################################################
# Maintenance Mode Management Script
#
# This script manages CloudFront maintenance mode with automatic cache
# invalidation to ensure changes take effect immediately.
#
# Usage:
#   ./maintenance-mode.sh <env> <command> [options]
#
# Commands:
#   on              Enable maintenance mode
#   off             Disable maintenance mode
#   status          Check current maintenance mode status
#   whitelist-add   Add IP(s) to whitelist
#   whitelist-rm    Remove IP(s) from whitelist
#   whitelist-show  Show current whitelisted IPs
#   whitelist-clear Clear all whitelisted IPs
#
# Examples:
#   ./maintenance-mode.sh tmp on
#   ./maintenance-mode.sh tmp off
#   ./maintenance-mode.sh tmp status
#   ./maintenance-mode.sh tmp whitelist-add 203.0.113.1,198.51.100.50
#   ./maintenance-mode.sh tmp whitelist-show
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 <env> <command> [options]

Environment:
  tmp, devel, produ, hosoy    Deployment environment

Commands:
  on                          Enable maintenance mode
  off                         Disable maintenance mode
  status                      Check current maintenance mode status
  whitelist-add <ips>         Add comma-separated IP(s) to whitelist
  whitelist-rm <ips>          Remove comma-separated IP(s) from whitelist
  whitelist-show              Show current whitelisted IPs
  whitelist-clear             Clear all whitelisted IPs

Options:
  --profile <name>            AWS profile to use (default: genu)
  --no-invalidate             Skip CloudFront cache invalidation
  --help                      Show this help message

Examples:
  $0 tmp on
  $0 tmp off --profile production
  $0 tmp status
  $0 tmp whitelist-add 203.0.113.1,198.51.100.50
  $0 tmp whitelist-rm 203.0.113.1
  $0 tmp whitelist-show
  $0 tmp whitelist-clear
EOF
    exit 1
}

# Parse arguments
if [ $# -lt 2 ]; then
    usage
fi

ENV="$1"
COMMAND="$2"
shift 2

# Default options
AWS_PROFILE="genu"
INVALIDATE_CACHE="true"

# Parse optional arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --no-invalidate)
            INVALIDATE_CACHE="false"
            shift
            ;;
        --help)
            usage
            ;;
        *)
            # This handles positional arguments for whitelist commands
            EXTRA_ARG="$1"
            shift
            ;;
    esac
done

# Validate environment
case "$ENV" in
    tmp|devel|produ|hosoy)
        ;;
    *)
        print_error "Invalid environment: $ENV"
        echo "Valid environments: tmp, devel, produ, hosoy"
        exit 1
        ;;
esac

# Export AWS profile
export AWS_PROFILE

print_info "Using AWS profile: $AWS_PROFILE"
print_info "Environment: $ENV"

# Get stack name
STACK_NAME="GenerativeAiUseCasesStack${ENV}-WebNestedStackWebNestedStackResource752C006F-*"
WEB_STACK=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
    --query "StackSummaries[?contains(StackName, 'GenerativeAiUseCasesStack${ENV}') && contains(StackName, 'WebNestedStack')].StackName" \
    --output text 2>/dev/null | head -1)

if [ -z "$WEB_STACK" ]; then
    print_error "Could not find Web stack for environment: $ENV"
    exit 1
fi

print_info "Found stack: $WEB_STACK"

# Get KVS ARN and Distribution ID
print_info "Retrieving CloudFormation outputs..."
KVS_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK" \
    --query 'Stacks[0].Outputs[?OutputKey==`MaintenanceKVSArn`].OutputValue' \
    --output text 2>/dev/null)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text 2>/dev/null)

# If distribution ID not found in outputs, try to extract from WebUrl
if [ -z "$DISTRIBUTION_ID" ]; then
    WEB_URL=$(aws cloudformation describe-stacks \
        --stack-name "$WEB_STACK" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebUrl`].OutputValue' \
        --output text 2>/dev/null)

    if [ -n "$WEB_URL" ]; then
        DOMAIN=$(echo "$WEB_URL" | sed 's|https://||' | sed 's|/.*||')
        # Search by both DomainName (default CloudFront domain) and Aliases (custom domains)
        DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?DomainName=='$DOMAIN' || contains(Aliases.Items || \`[]\`, '$DOMAIN')].Id" \
            --output text 2>/dev/null)
    fi
fi

if [ -z "$KVS_ARN" ]; then
    print_error "Could not find MaintenanceKVSArn in stack outputs"
    exit 1
fi

if [ -z "$DISTRIBUTION_ID" ]; then
    print_error "Could not find CloudFront Distribution ID"
    exit 1
fi

print_success "KVS ARN: $KVS_ARN"
print_success "Distribution ID: $DISTRIBUTION_ID"

# Get current ETag
get_etag() {
    aws cloudfront-keyvaluestore describe-key-value-store \
        --kvs-arn "$KVS_ARN" \
        --query 'ETag' \
        --output text 2>/dev/null
}

# Get current key value
get_key() {
    local key="$1"
    aws cloudfront-keyvaluestore get-key \
        --kvs-arn "$KVS_ARN" \
        --key "$key" \
        --query 'Value' \
        --output text 2>/dev/null || echo ""
}

# Initialize KeyValueStore if keys don't exist
initialize_kvs() {
    print_info "Checking if KeyValueStore is initialized..."

    # Try to get maintenance key
    local maintenance_value=$(get_key "maintenance" 2>/dev/null)
    local ipwhitelist_value=$(get_key "ipWhitelist" 2>/dev/null)

    # If either key doesn't exist, initialize both
    if [ -z "$maintenance_value" ] || [ -z "$ipwhitelist_value" ]; then
        print_warning "KeyValueStore not initialized. Initializing with default values..."

        local etag=$(get_etag)

        # Set maintenance key if it doesn't exist
        if [ -z "$maintenance_value" ]; then
            print_info "Setting 'maintenance' key to 'false'"
            etag=$(aws cloudfront-keyvaluestore put-key \
                --kvs-arn "$KVS_ARN" \
                --key "maintenance" \
                --value "false" \
                --if-match "$etag" \
                --query 'ETag' \
                --output text 2>/dev/null)

            if [ -z "$etag" ]; then
                print_error "Failed to initialize 'maintenance' key"
                exit 1
            fi
        fi

        # Set ipWhitelist key if it doesn't exist
        if [ -z "$ipwhitelist_value" ]; then
            # Get fresh ETag if we just set maintenance key
            if [ -n "$maintenance_value" ]; then
                etag=$(get_etag)
            fi

            print_info "Setting 'ipWhitelist' key to empty string"
            etag=$(aws cloudfront-keyvaluestore put-key \
                --kvs-arn "$KVS_ARN" \
                --key "ipWhitelist" \
                --value "" \
                --if-match "$etag" \
                --query 'ETag' \
                --output text 2>/dev/null)

            if [ -z "$etag" ]; then
                print_error "Failed to initialize 'ipWhitelist' key"
                exit 1
            fi
        fi

        print_success "KeyValueStore initialized successfully"
    else
        print_success "KeyValueStore already initialized"
    fi
}

# Initialize KVS before any operations
initialize_kvs

# Set key value
set_key() {
    local key="$1"
    local value="$2"
    local etag=$(get_etag)

    aws cloudfront-keyvaluestore put-key \
        --kvs-arn "$KVS_ARN" \
        --key "$key" \
        --value "$value" \
        --if-match "$etag" \
        --output json 2>/dev/null | jq -r '.ETag'
}

# Invalidate CloudFront cache
invalidate_cache() {
    if [ "$INVALIDATE_CACHE" = "true" ]; then
        print_info "Invalidating CloudFront cache..."
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$DISTRIBUTION_ID" \
            --paths "/*" \
            --query 'Invalidation.Id' \
            --output text 2>/dev/null)

        if [ -n "$INVALIDATION_ID" ]; then
            print_success "Cache invalidation created: $INVALIDATION_ID"
            print_warning "Note: Cache invalidation may take 30-60 seconds to propagate"
            print_warning "Users should hard refresh (Ctrl+Shift+R or Cmd+Shift+R) their browsers"
        else
            print_error "Failed to create cache invalidation"
        fi
    else
        print_warning "Skipping cache invalidation (--no-invalidate flag used)"
    fi
}

# Execute command
case "$COMMAND" in
    on)
        print_info "Enabling maintenance mode..."
        NEW_ETAG=$(set_key "maintenance" "true")
        if [ -n "$NEW_ETAG" ]; then
            print_success "Maintenance mode ENABLED"
            print_info "New ETag: $NEW_ETAG"
            invalidate_cache
        else
            print_error "Failed to enable maintenance mode"
            exit 1
        fi
        ;;

    off)
        print_info "Disabling maintenance mode..."
        NEW_ETAG=$(set_key "maintenance" "false")
        if [ -n "$NEW_ETAG" ]; then
            print_success "Maintenance mode DISABLED"
            print_info "New ETag: $NEW_ETAG"
            invalidate_cache
        else
            print_error "Failed to disable maintenance mode"
            exit 1
        fi
        ;;

    status)
        print_info "Checking maintenance mode status..."
        MAINTENANCE=$(get_key "maintenance")
        WHITELIST=$(get_key "ipWhitelist")

        echo ""
        echo "=== Maintenance Mode Status ==="
        if [ "$MAINTENANCE" = "true" ]; then
            print_error "Maintenance mode: ENABLED"
        else
            print_success "Maintenance mode: DISABLED"
        fi

        echo ""
        echo "=== IP Whitelist ==="
        if [ -z "$WHITELIST" ]; then
            echo "No IPs whitelisted"
        else
            echo "$WHITELIST" | tr ',' '\n' | while read ip; do
                if [ -n "$ip" ]; then
                    echo "  - $ip"
                fi
            done
        fi

        echo ""
        echo "=== CloudFront Distribution ==="
        echo "  Distribution ID: $DISTRIBUTION_ID"
        WEB_URL=$(aws cloudformation describe-stacks \
            --stack-name "$WEB_STACK" \
            --query 'Stacks[0].Outputs[?OutputKey==`WebUrl`].OutputValue' \
            --output text 2>/dev/null)
        if [ -n "$WEB_URL" ]; then
            echo "  URL: $WEB_URL"
        fi
        ;;

    whitelist-add)
        if [ -z "$EXTRA_ARG" ]; then
            print_error "No IP addresses provided"
            echo "Usage: $0 $ENV whitelist-add <comma-separated-ips>"
            exit 1
        fi

        print_info "Adding IPs to whitelist: $EXTRA_ARG"
        CURRENT_WHITELIST=$(get_key "ipWhitelist")

        if [ -z "$CURRENT_WHITELIST" ]; then
            NEW_WHITELIST="$EXTRA_ARG"
        else
            # Combine and deduplicate
            NEW_WHITELIST=$(echo "$CURRENT_WHITELIST,$EXTRA_ARG" | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$//')
        fi

        NEW_ETAG=$(set_key "ipWhitelist" "$NEW_WHITELIST")
        if [ -n "$NEW_ETAG" ]; then
            print_success "IP whitelist updated"
            echo "Current whitelist:"
            echo "$NEW_WHITELIST" | tr ',' '\n' | while read ip; do
                if [ -n "$ip" ]; then
                    echo "  - $ip"
                fi
            done
            invalidate_cache
        else
            print_error "Failed to update IP whitelist"
            exit 1
        fi
        ;;

    whitelist-rm)
        if [ -z "$EXTRA_ARG" ]; then
            print_error "No IP addresses provided"
            echo "Usage: $0 $ENV whitelist-rm <comma-separated-ips>"
            exit 1
        fi

        print_info "Removing IPs from whitelist: $EXTRA_ARG"
        CURRENT_WHITELIST=$(get_key "ipWhitelist")

        if [ -z "$CURRENT_WHITELIST" ]; then
            print_warning "Whitelist is already empty"
            exit 0
        fi

        # Remove specified IPs
        IFS=',' read -ra REMOVE_IPS <<< "$EXTRA_ARG"
        NEW_WHITELIST="$CURRENT_WHITELIST"

        for ip in "${REMOVE_IPS[@]}"; do
            NEW_WHITELIST=$(echo "$NEW_WHITELIST" | tr ',' '\n' | grep -v "^${ip}$" | tr '\n' ',' | sed 's/,$//')
        done

        NEW_ETAG=$(set_key "ipWhitelist" "$NEW_WHITELIST")
        if [ -n "$NEW_ETAG" ]; then
            print_success "IP whitelist updated"
            if [ -z "$NEW_WHITELIST" ]; then
                echo "Whitelist is now empty"
            else
                echo "Current whitelist:"
                echo "$NEW_WHITELIST" | tr ',' '\n' | while read ip; do
                    if [ -n "$ip" ]; then
                        echo "  - $ip"
                    fi
                done
            fi
            invalidate_cache
        else
            print_error "Failed to update IP whitelist"
            exit 1
        fi
        ;;

    whitelist-show)
        print_info "Current IP whitelist:"
        WHITELIST=$(get_key "ipWhitelist")

        if [ -z "$WHITELIST" ]; then
            echo "No IPs whitelisted"
        else
            echo "$WHITELIST" | tr ',' '\n' | while read ip; do
                if [ -n "$ip" ]; then
                    echo "  - $ip"
                fi
            done
        fi
        ;;

    whitelist-clear)
        print_info "Clearing IP whitelist..."
        NEW_ETAG=$(set_key "ipWhitelist" "")
        if [ -n "$NEW_ETAG" ]; then
            print_success "IP whitelist cleared"
            invalidate_cache
        else
            print_error "Failed to clear IP whitelist"
            exit 1
        fi
        ;;

    *)
        print_error "Unknown command: $COMMAND"
        usage
        ;;
esac

echo ""
print_success "Operation completed successfully!"
