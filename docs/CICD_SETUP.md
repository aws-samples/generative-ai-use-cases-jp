# CI/CD Setup Guide

This guide explains how to set up CI/CD for this project using GitHub Actions with OIDC authentication and secure CDK configuration management.

## Architecture Overview

The CI/CD pipeline uses:
- **GitHub Actions** for workflow orchestration
- **Dagger** for containerized, reproducible builds
- **AWS OIDC** for secure, temporary credentials (no long-lived access keys)
- **GitHub Secrets** for base64-encoded CDK configuration

## Prerequisites

- AWS Account with appropriate permissions
- GitHub repository with Actions enabled
- GitHub CLI (`gh`) installed locally
- `jq` for JSON validation (optional but recommended)

## Setup Steps

### 1. AWS OIDC Configuration

#### 1.1 Create OIDC Identity Provider

```bash
# Create OIDC provider (one-time setup per AWS account)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

#### 1.2 Create IAM Role

Create a trust policy file `github-oidc-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**Important:** Replace:
- `YOUR_ACCOUNT_ID` with your AWS account ID
- `YOUR_GITHUB_ORG/YOUR_REPO` with your GitHub repository path

Create the IAM role:

```bash
# Create role
aws iam create-role \
  --role-name github-actions-role \
  --assume-role-policy-document file://github-oidc-trust-policy.json

# Attach permissions (adjust as needed - this example uses full admin)
aws iam attach-role-policy \
  --role-name github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

**Security Note:** In production, use least-privilege permissions instead of `AdministratorAccess`. Create a custom policy with only CDK deployment permissions.

#### 1.3 Get Role ARN

```bash
aws iam get-role --role-name github-actions-role --query 'Role.Arn' --output text
```

Save this ARN for the next step.

### 2. GitHub Configuration

#### 2.1 Set GitHub Variables

```bash
# Set AWS region
gh variable set AWS_DEFAULT_REGION --body "us-east-1"

# Set IAM role ARN (from step 1.3)
gh variable set AWS_DEPLOY_ROLE_ARN --body "arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-role"
```

#### 2.2 Prepare CDK Configuration

Copy the example configuration:

```bash
cp cdk.json.example packages/cdk/cdk.json
```

Edit `packages/cdk/cdk.json` with your configuration:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/generative-ai-use-cases.ts",
  "context": {
    "env": "prod",
    "modelRegion": "us-east-1",
    "ragEnabled": true,
    "selfSignUpEnabled": false,
    ...
  }
}
```

See [DEPLOY_OPTION.md](./DEPLOY_OPTION.md) for all available configuration options.

#### 2.3 Upload CDK Configuration to GitHub Secrets

Use the provided script:

```bash
./scripts/upload-cdk-config.sh
```

Or manually:

```bash
# Encode and upload
base64 -w 0 < packages/cdk/cdk.json | gh secret set CDK_CONFIG_BASE64
```

**Options for upload script:**

```bash
# Show help
./scripts/upload-cdk-config.sh --help

# Upload from custom path
./scripts/upload-cdk-config.sh /path/to/custom-cdk.json

# Just output base64 without uploading
./scripts/upload-cdk-config.sh --output

# Use custom secret name
./scripts/upload-cdk-config.sh --secret-name MY_CDK_CONFIG
```

### 3. Verify Setup

Check that all required secrets and variables are set:

```bash
# List variables
gh variable list

# Should show:
# AWS_DEFAULT_REGION    us-east-1
# AWS_DEPLOY_ROLE_ARN   arn:aws:iam::...

# List secrets
gh secret list

# Should show:
# CDK_CONFIG_BASE64     Updated YYYY-MM-DD
```

### 4. Test Deployment

#### 4.1 Local Testing (Optional)

Test the Dagger pipeline locally:

```bash
# CI stage only
cd dagger
npm run ci

# Full deployment (requires AWS credentials and CDK_CONFIG_BASE64)
export CDK_CONFIG_BASE64=$(base64 -w 0 < ../packages/cdk/cdk.json)
npm run deploy
```

#### 4.2 Trigger GitHub Actions

Push to main branch or create a tag:

```bash
# Push to main (triggers CI + deploy)
git push origin main

# Create and push tag (triggers CI + deploy)
git tag v1.0.0
git push origin v1.0.0

# Pull request (CI only, no deploy)
git checkout -b feature/test
git push origin feature/test
# Create PR via gh pr create
```

## Workflow Behavior

### On Pull Request
- ✅ Run quality checks (lint, type check)
- ✅ Build all packages
- ❌ No deployment

### On Push to Main
- ✅ Run quality checks
- ✅ Build all packages
- ✅ Assume AWS role via OIDC
- ✅ Decode cdk.json from GitHub Secrets
- ✅ Deploy to AWS

### On Tag Push (v*)
- Same as push to main

## Updating Configuration

### Update CDK Configuration

When you need to change deployment settings:

1. Edit your local `packages/cdk/cdk.json`
2. Upload to GitHub Secrets:
   ```bash
   ./scripts/upload-cdk-config.sh
   ```
3. Push to trigger deployment:
   ```bash
   git push origin main
   ```

### Update AWS Credentials/Role

If you need to change the IAM role:

1. Update the role in AWS IAM
2. Update GitHub variable:
   ```bash
   gh variable set AWS_DEPLOY_ROLE_ARN --body "arn:aws:iam::ACCOUNT:role/NewRole"
   ```

## Security Best Practices

### ✅ DO

- Use OIDC for authentication (no long-lived credentials)
- Restrict IAM role permissions to minimum required
- Limit role assumption to specific branches/tags
- Review `cdk.json` before uploading
- Use separate configurations for dev/staging/prod
- Rotate credentials regularly (OIDC handles this automatically)

### ❌ DON'T

- Store AWS credentials in GitHub Secrets
- Use `AdministratorAccess` in production
- Commit `packages/cdk/cdk.json` to version control (it's gitignored)
- Share base64-encoded secrets in chat/email
- Allow all branches to deploy

## Troubleshooting

### "CDK_CONFIG_BASE64 environment variable not found"

**Cause:** Secret not set in GitHub

**Solution:**
```bash
./scripts/upload-cdk-config.sh
```

### "Error: Could not assume role"

**Cause:** OIDC trust policy mismatch

**Solution:** Verify trust policy allows your repository:
```bash
aws iam get-role --role-name github-actions-role --query 'Role.AssumeRolePolicyDocument'
```

### "CDK deploy failed: Invalid context"

**Cause:** Invalid `cdk.json` configuration

**Solution:** Validate JSON locally:
```bash
jq empty packages/cdk/cdk.json
```

### "Access Denied" during deployment

**Cause:** IAM role lacks required permissions

**Solution:** Add necessary policies to the IAM role:
```bash
aws iam attach-role-policy \
  --role-name github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Workflow                                     │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │ Checkout     │─────▶│ Setup Node   │                   │
│  └──────────────┘      └──────────────┘                   │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────────┐                    │
│                    │ Configure AWS    │◀────OIDC Token     │
│                    │ (OIDC)          │                    │
│                    └──────────────────┘                    │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────┐              │
│  │ Dagger Pipeline                         │              │
│  │                                         │              │
│  │  ┌──────────┐    ┌─────────────┐      │              │
│  │  │ Decode   │───▶│ Bootstrap   │      │              │
│  │  │ cdk.json │    │ CDK         │      │              │
│  │  └──────────┘    └─────────────┘      │              │
│  │        │               │                │              │
│  │        │               ▼                │              │
│  │        │      ┌─────────────┐          │              │
│  │        └─────▶│ Deploy CDK  │          │              │
│  │               └─────────────┘          │              │
│  └─────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ AWS CloudFormation│
              │ Stacks            │
              └──────────────────┘
```

## Additional Resources

- [AWS OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Dagger Documentation](https://docs.dagger.io/)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review GitHub Actions logs
3. Check AWS CloudWatch logs
4. Open an issue in the repository