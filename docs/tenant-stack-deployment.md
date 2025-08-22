# Tenant Stack Deployment

This document explains how to deploy tenant-specific DynamoDB stacks separately from the main application stack.

## Overview

The CDK application supports deploying tenant-specific infrastructure separately using a simplified table-based approach. This allows you to:

- Manage tenant resources independently
- Scale tenant infrastructure as needed
- Provide complete data isolation between tenants

## Architecture

The tenant-specific deployment creates isolated DynamoDB tables for each tenant, eliminating the need for complex IAM role management. Each tenant gets their own set of tables with environment-aware naming and appropriate deletion protection.

## Configuration Files

The application uses separate CDK configuration files for different deployment types:

- `cdk.json` - Configuration for common stacks (main application)
- `cdk.tenant.json` - Configuration for tenant-specific stacks (gitignored)
- `packages/cdk/cdk.tenant.example.json` - Example template for tenant configuration

This separation allows you to maintain different environment settings for common and tenant deployments.

To get started with tenant deployments:

1. Copy `packages/cdk/cdk.tenant.example.json` to `packages/cdk/cdk.tenant.json`
2. Update the values with your tenant-specific configuration
3. Run `npm run cdk:tenant:deploy`

## Deployment Commands

The application provides separate deployment commands for common and tenant stacks:

- `npm run cdk:deploy` - Deploys all common stacks using `cdk.json`
- `npm run cdk:tenant:deploy` - Deploys tenant-specific stacks using `cdk.tenant.json`
- `npm run cdk:tenant:synth` - Synthesizes tenant stacks without deployment
- `npm run cdk:tenant:diff` - Shows differences for tenant stacks
- `npm run cdk:tenant:list` - Lists all tenant stacks
- `npm run cdk:destroy` - Destroys all common stacks
- `npm run cdk:tenant:destroy` - Destroys all tenant stacks

## Directory Structure

```
packages/cdk/lib/
├── stacks/
│   ├── common/          # Common stacks (main application)
│   │   ├── agent-stack.ts
│   │   ├── cloud-front-waf-stack.ts
│   │   ├── dashboard-stack.ts
│   │   ├── generative-ai-use-cases-stack.ts
│   │   ├── guardrail-stack.ts
│   │   ├── rag-knowledge-base-stack.ts
│   │   └── video-tmp-bucket-stack.ts
│   └── tenant/          # Tenant-specific stacks
│       └── tenant-dynamodb-stack.ts
├── construct/
│   └── tenant-dynamodb.ts  # DynamoDB construct for tenant tables
├── create-stacks.ts     # Main stack creation
└── create-tenant-stacks.ts  # Tenant stack creation
```

## Deploying Tenant DynamoDB Stacks

### Configuration

Configure tenant deployments by creating a `packages/cdk/cdk.tenant.json` file:

```json
{
  "context": {
    "tenantId": "tenant123",
    "environment": "dev",
    "tenantRegion": "us-east-1"
  }
}
```

### Deployment Commands

```bash
# Deploy all tenant stacks
npm run cdk:tenant:deploy

# Deploy a specific tenant stack
npm run cdk:tenant:deploy -- TenantDynamoDBStackdev-tenant123

# Synthesize tenant stacks (without deployment)
npm run cdk:tenant:synth

# Show differences for tenant stacks
npm run cdk:tenant:diff

# List all tenant stacks
npm run cdk:tenant:list

# Destroy all tenant stacks
npm run cdk:tenant:destroy
```

### Configuration Options

- `tenantId` (required): Unique identifier for the tenant
- `environment` (required): Environment name (e.g., dev, staging, prod)
- `tenantRegion`: AWS region for deployment (default: CDK_DEFAULT_REGION or us-east-1)

## Tenant DynamoDB Tables

The tenant deployment creates three dedicated tables for each tenant:

### Table Naming Convention

All tables follow the pattern: `{BaseTableName}-{environment}-tenant-{tenantId}`

### ChatHistory Table
- **Purpose**: Stores tenant-specific chat conversation history
- **Partition Key**: `id` (STRING)
- **Sort Key**: `createdDate` (STRING)
- **Global Secondary Index**: `FeedbackIndex` on `feedback` attribute

### TokenUsageStats Table
- **Purpose**: Tracks token usage statistics for the tenant
- **Partition Key**: `id` (STRING)
- **Sort Key**: `userId` (STRING)
- **Global Secondary Index**: `MonthIndex` for monthly aggregation

### UseCaseBuilder Table
- **Purpose**: Stores tenant-specific use case configurations
- **Partition Key**: `id` (STRING)
- **Sort Key**: `dataType` (STRING)
- **Global Secondary Index**: `UseCaseIdIndexName` for use case queries

### Environment-Based Features

- **Deletion Protection**: Tables in production environments (`prod`) use `RETAIN` removal policy, while development environments (`dev`) use `DESTROY` for easier cleanup
- **Billing Mode**: All tables use `PAY_PER_REQUEST` billing mode for cost optimization
- **Tagging**: All tables are automatically tagged with `TenantId` and `Environment` for resource management

## Stack Naming

Tenant stacks are named using the pattern: `TenantDynamoDBStack{environment}-{tenantId}`

Examples:
- Development: `TenantDynamoDBStackdev-tenant123`
- Production: `TenantDynamoDBStackprod-tenant123`

## Adding More Tenant Stacks

To add more tenant-specific stacks:

1. Create a new stack class in `packages/cdk/lib/stacks/tenant/`
2. Import and instantiate it in `packages/cdk/lib/create-tenant-stacks.ts`
3. Deploy using the same pattern as above

## Best Practices

1. **Naming Convention**: Use consistent naming for tenant resources including environment and tenant ID
2. **Table Naming**: Follow the pattern `{BaseTableName}-{environment}-tenant-{tenantId}` for all DynamoDB tables
3. **Environment Isolation**: Use different environments (dev, staging, prod) for proper lifecycle management
4. **Deletion Protection**: Ensure production tables have appropriate removal policies to prevent accidental deletion
5. **Resource Tagging**: All tenant resources are automatically tagged for cost tracking and management
6. **Testing**: Always test tenant stack deployments in a development environment first
7. **Documentation**: Document any tenant-specific configurations or requirements
