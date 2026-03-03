# API E2E Tests

End-to-end tests for deployed API Gateway endpoints.

## Prerequisites

1. CDK stack is deployed
2. Test user exists in Cognito User Pool
3. Node.js dependencies installed (`npm ci`)

## Setup

### Create Test User

```bash
# Load environment variables
source ./setup-env.sh <env-name>

# Create test user
aws cognito-idp admin-create-user \
  --user-pool-id "$VITE_APP_USER_POOL_ID" \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --region "$VITE_APP_REGION"

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id "$VITE_APP_USER_POOL_ID" \
  --username test@example.com \
  --password Test123! \
  --permanent \
  --region "$VITE_APP_REGION"
```

## Running Tests

```bash
# Set credentials
export COGNITO_EMAIL=test@example.com
export COGNITO_PASSWORD=Test123!

# Run E2E tests
npm run cdk:test:e2e --env=<env-name>

# Example: default environment
npm run cdk:test:e2e
```

The script automatically:

1. Loads environment variables via `setup-env.sh`
2. Obtains ID token using Cognito SRP authentication
3. Runs E2E tests

## Test Coverage

Tests verify the following endpoints:

- Chat management (GET, POST, DELETE)
- Predictions (POST)
- System contexts (GET, POST)
- Use cases (GET)
- Token usage (GET)
- Web text extraction (GET)
- Share links (POST)
- File upload URLs (POST)
- Authentication (401)

## Troubleshooting

### Authentication Failed

```
Error: Could not get ID token
Authentication failed: ...
```

**Solution:**

1. Verify user exists
2. Check password is correct
3. Ensure user status is `CONFIRMED`

### User Does Not Exist

```
User does not exist
```

**Solution:** Create test user using the setup commands above.

## CI/CD

Example GitHub Actions workflow:

```yaml
- name: Create test user
  run: |
    source ./setup-env.sh ${{ env.ENV_NAME }}

    aws cognito-idp admin-create-user \
      --user-pool-id "$VITE_APP_USER_POOL_ID" \
      --username test@example.com \
      --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
      --temporary-password TempPass123! \
      --message-action SUPPRESS \
      --region "$VITE_APP_REGION"

    aws cognito-idp admin-set-user-password \
      --user-pool-id "$VITE_APP_USER_POOL_ID" \
      --username test@example.com \
      --password Test123! \
      --permanent \
      --region "$VITE_APP_REGION"

- name: Run E2E Tests
  env:
    COGNITO_EMAIL: test@example.com
    COGNITO_PASSWORD: Test123!
  run: npm run cdk:test:e2e --env=${{ env.ENV_NAME }}
```

## Notes

- E2E tests run against actual AWS resources
- AWS charges may apply
- Keep test credentials secure
- Not recommended for production environments
