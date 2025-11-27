#!/bin/bash
set -e

#############################################################################
# Maintenance Mode Validation Script
#
# This script validates that maintenance mode is working correctly
# by testing the CloudFront distribution behavior.
#############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

if [ $# -lt 1 ]; then
    echo "Usage: $0 <env> [--profile <profile>]"
    echo ""
    echo "Environments: tmp, devel, produ, hosoy"
    exit 1
fi

ENV="$1"
shift

AWS_PROFILE="genu"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

export AWS_PROFILE

print_info "Validating maintenance mode for environment: $ENV"
print_info "Using AWS profile: $AWS_PROFILE"
echo ""

# Get stack info
WEB_STACK=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
    --query "StackSummaries[?contains(StackName, 'GenerativeAiUseCasesStack${ENV}') && contains(StackName, 'WebNestedStack')].StackName" \
    --output text 2>/dev/null | head -1)

if [ -z "$WEB_STACK" ]; then
    print_error "Could not find Web stack for environment: $ENV"
    exit 1
fi

# Get outputs
KVS_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK" \
    --query 'Stacks[0].Outputs[?OutputKey==`MaintenanceKVSArn`].OutputValue' \
    --output text 2>/dev/null)

WEB_URL=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebUrl`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$KVS_ARN" ] || [ -z "$WEB_URL" ]; then
    print_error "Could not retrieve stack outputs"
    exit 1
fi

DOMAIN=$(echo "$WEB_URL" | sed 's|https://||' | sed 's|/.*||')
# Search by both DomainName (default CloudFront domain) and Aliases (custom domains)
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?DomainName=='$DOMAIN' || contains(Aliases.Items || \`[]\`, '$DOMAIN')].Id" \
    --output text 2>/dev/null)

echo "=== Configuration ==="
echo "  Stack: $WEB_STACK"
echo "  KVS ARN: $KVS_ARN"
echo "  URL: $WEB_URL"
echo "  Distribution: $DISTRIBUTION_ID"
echo ""

# Test 1: Check KVS exists and has required keys
echo "=== Test 1: KeyValueStore Configuration ==="
MAINTENANCE=$(aws cloudfront-keyvaluestore get-key \
    --kvs-arn "$KVS_ARN" \
    --key "maintenance" \
    --query 'Value' \
    --output text 2>/dev/null || echo "MISSING")

WHITELIST=$(aws cloudfront-keyvaluestore get-key \
    --kvs-arn "$KVS_ARN" \
    --key "ipWhitelist" \
    --query 'Value' \
    --output text 2>/dev/null || echo "MISSING")

if [ "$MAINTENANCE" = "MISSING" ]; then
    print_error "maintenance key is missing in KVS"
    exit 1
else
    print_success "maintenance key found: $MAINTENANCE"
fi

if [ "$WHITELIST" = "MISSING" ]; then
    print_error "ipWhitelist key is missing in KVS"
    exit 1
else
    print_success "ipWhitelist key found: ${WHITELIST:-<empty>}"
fi
echo ""

# Test 2: Check CloudFront functions
echo "=== Test 2: CloudFront Functions ==="
VIEWER_REQUEST_FUNC=$(aws cloudfront get-distribution-config \
    --id "$DISTRIBUTION_ID" \
    --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[?EventType==`viewer-request`].FunctionARN' \
    --output text 2>/dev/null)

VIEWER_RESPONSE_FUNC=$(aws cloudfront get-distribution-config \
    --id "$DISTRIBUTION_ID" \
    --query 'DistributionConfig.DefaultCacheBehavior.FunctionAssociations.Items[?EventType==`viewer-response`].FunctionARN' \
    --output text 2>/dev/null)

if [ -z "$VIEWER_REQUEST_FUNC" ]; then
    print_error "No viewer-request function attached"
    exit 1
else
    print_success "viewer-request function attached"
fi

if [ -z "$VIEWER_RESPONSE_FUNC" ]; then
    print_warning "No viewer-response function attached (optional)"
else
    print_success "viewer-response function attached"
fi
echo ""

# Test 3: Test actual behavior
echo "=== Test 3: Testing Actual Behavior ==="
UNIQUE_PATH="/test-$(date +%s%N).html"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}${UNIQUE_PATH}" 2>/dev/null)

if [ "$MAINTENANCE" = "true" ]; then
    if [ "$HTTP_STATUS" = "302" ]; then
        print_success "Maintenance mode ON - correctly redirecting (HTTP $HTTP_STATUS)"

        # Check redirect location
        LOCATION=$(curl -s -I "${WEB_URL}${UNIQUE_PATH}" 2>/dev/null | grep -i "location:" | awk '{print $2}' | tr -d '\r')
        if [[ "$LOCATION" == *"/maintenance.html"* ]]; then
            print_success "Redirects to /maintenance.html"
        else
            print_warning "Redirect location: $LOCATION (expected /maintenance.html)"
        fi
    elif [ "$HTTP_STATUS" = "200" ]; then
        print_error "Maintenance mode ON but got HTTP $HTTP_STATUS (should be 302)"
        print_warning "Possible causes:"
        print_warning "  1. CloudFront cache not invalidated"
        print_warning "  2. Your IP might be whitelisted"
        print_warning "  3. Function error (failing open)"
    else
        print_warning "Unexpected HTTP status: $HTTP_STATUS"
    fi
else
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ]; then
        print_success "Maintenance mode OFF - site accessible (HTTP $HTTP_STATUS)"
    elif [ "$HTTP_STATUS" = "302" ]; then
        print_error "Maintenance mode OFF but got HTTP $HTTP_STATUS (should be 200/404)"
        print_warning "Possible causes:"
        print_warning "  1. CloudFront cache not invalidated"
        print_warning "  2. Browser cache showing old redirect"
        print_warning "  3. Run: ./maintenance-mode.sh $ENV off"
    else
        print_warning "Unexpected HTTP status: $HTTP_STATUS"
    fi
fi
echo ""

# Test 4: Check cache invalidations
echo "=== Test 4: Recent Cache Invalidations ==="
RECENT_INVALIDATIONS=$(aws cloudfront list-invalidations \
    --distribution-id "$DISTRIBUTION_ID" \
    --max-items 3 \
    --query 'InvalidationList.Items[*].[Id,Status,CreateTime]' \
    --output text 2>/dev/null)

if [ -n "$RECENT_INVALIDATIONS" ]; then
    print_success "Recent invalidations found:"
    echo "$RECENT_INVALIDATIONS" | while read id status time; do
        echo "    $status - $id (created: $time)"
    done
else
    print_warning "No recent invalidations found"
fi
echo ""

# Summary
echo "=== Validation Summary ==="
if [ "$MAINTENANCE" = "true" ]; then
    if [ "$HTTP_STATUS" = "302" ]; then
        print_success "All checks passed! Maintenance mode is working correctly."
    else
        print_error "Maintenance mode is ON in KVS but not working correctly."
        print_warning "Action required: Invalidate cache and wait 60 seconds"
        echo "  Run: ./maintenance-mode.sh $ENV on"
    fi
else
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ]; then
        print_success "All checks passed! Site is accessible normally."
    else
        print_error "Maintenance mode is OFF in KVS but site still redirecting."
        print_warning "Action required: Invalidate cache and hard refresh browser"
        echo "  Run: ./maintenance-mode.sh $ENV off"
        echo "  Browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
    fi
fi
echo ""

exit 0
