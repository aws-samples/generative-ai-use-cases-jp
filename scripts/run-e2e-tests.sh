#!/bin/bash

set -eu

# Get ID token from Cognito
echo "Getting ID token from Cognito..."

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    exit 1
fi

# Check if required variables are set
if [ -z "${VITE_APP_USER_POOL_CLIENT_ID:-}" ]; then
    echo "Error: VITE_APP_USER_POOL_CLIENT_ID is not set"
    echo "Please run: source ./setup-env.sh <env-name>"
    exit 1
fi

if [ -z "${VITE_APP_REGION:-}" ]; then
    echo "Error: VITE_APP_REGION is not set"
    echo "Please run: source ./setup-env.sh <env-name>"
    exit 1
fi

if [ -z "${VITE_APP_API_ENDPOINT:-}" ]; then
    echo "Error: VITE_APP_API_ENDPOINT is not set"
    echo "Please run: source ./setup-env.sh <env-name>"
    exit 1
fi

# If ID_TOKEN is already set, skip authentication
if [ -n "${ID_TOKEN:-}" ]; then
    echo "Using provided ID_TOKEN"
else
    # Get credentials
    EMAIL="${COGNITO_EMAIL:-}"
    PASSWORD="${COGNITO_PASSWORD:-}"

    if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
        echo ""
        echo "Error: COGNITO_EMAIL and COGNITO_PASSWORD are required"
        echo ""
        echo "Please set environment variables:"
        echo "  export COGNITO_EMAIL=your-email@example.com"
        echo "  export COGNITO_PASSWORD=your-password"
        echo "  npm run cdk:test:e2e --env=<env-name>"
        echo ""
        echo "Or manually set ID_TOKEN:"
        echo "  export ID_TOKEN=eyJraWQ..."
        echo "  npm run cdk:test:e2e --env=<env-name>"
        exit 1
    fi

    # Get ID token using SRP authentication (more secure)
    ID_TOKEN=$(node scripts/get-cognito-token.js 2>&1)

    if [ -z "$ID_TOKEN" ] || [[ "$ID_TOKEN" == *"error"* ]] || [[ "$ID_TOKEN" == *"Error"* ]] || [[ "$ID_TOKEN" == *"Authentication failed"* ]]; then
        echo ""
        echo "Error: Could not get ID token"
        echo "$ID_TOKEN"
        echo ""
        echo "Possible reasons:"
        echo "  1. Invalid credentials"
        echo "  2. User does not exist"
        echo ""
        echo "To create a test user:"
        echo "  source ./setup-env.sh <env-name>"
        echo "  aws cognito-idp admin-create-user ..."
        exit 1
    fi

    echo "✓ ID token obtained successfully"
fi

echo "Running E2E tests against: ${VITE_APP_API_ENDPOINT}"

# Run E2E tests
export API_ENDPOINT="${VITE_APP_API_ENDPOINT}"
export ID_TOKEN="${ID_TOKEN}"

cd packages/cdk
npm test -- test/lambda/api/e2e.test.ts --testPathIgnorePatterns=""
