# Tenant Stack Deployment

This document explains how to deploy tenant-specific infrastructure stacks (DynamoDB and S3) separately from the main application stack.

## Overview

The CDK application supports deploying tenant-specific infrastructure separately using a simplified approach. This allows you to:

- Manage tenant resources independently (DynamoDB tables and S3 buckets)
- Scale tenant infrastructure as needed
- Provide complete data and storage isolation between tenants

## Architecture

The tenant-specific deployment creates isolated DynamoDB tables and S3 buckets for each tenant, eliminating the need for complex IAM role management. Each tenant gets their own set of resources with environment-aware naming and appropriate deletion protection.

### DynamoDB Tables

Each tenant receives dedicated DynamoDB tables for data storage with proper indexing and access patterns.

### S3 Buckets

Each tenant receives three dedicated S3 buckets:

- **Documents Bucket**: For RAG/knowledge base document storage
- **Chat Bucket**: For chat file attachments and uploads
- **Analytics Bucket**: For usage analytics and reporting data

All S3 buckets use a globally unique naming strategy with hash-based collision avoidance to ensure compliance with AWS S3 naming requirements.

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
│       ├── tenant-dynamodb-stack.ts
│       └── tenant-s3-stack.ts
├── construct/
│   ├── tenant-dynamodb.ts  # DynamoDB construct for tenant tables
│   └── tenant-s3.ts        # S3 construct for tenant buckets
├── create-stacks.ts     # Main stack creation
└── create-tenant-stacks.ts  # Tenant stack creation
```

## Deploying Tenant Infrastructure Stacks

### Configuration

Configure tenant deployments by creating a `packages/cdk/cdk.tenant.json` file:

```json
{
  "context": {
    "tenantId": "tenant123",
    "environment": "dev",
    "tenantRegion": "us-east-1",
    "enableAutoDelete": false
  }
}
```

### Deployment Commands

```bash
# Deploy all tenant stacks
npm run cdk:tenant:deploy

# Deploy specific tenant stacks
npm run cdk:tenant:deploy -- TenantDynamoDBStackdev-tenant123
npm run cdk:tenant:deploy -- TenantS3Stackdev-tenant123

# Deploy with context override (for development with destroyable resources)
npm run cdk:tenant:deploy -- --context tenantId=my-tenant --context environment=dev --context enableAutoDelete=true

# Deploy for production (with retained resources)
npm run cdk:tenant:deploy -- --context tenantId=my-tenant --context environment=prod --context enableAutoDelete=false

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
- `enableAutoDelete`: Boolean flag for resource deletion policy (true = DESTROY, false = RETAIN, default: false)

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

- **Deletion Protection**: Resources use `RETAIN` removal policy when `enableAutoDelete` is `false`, or `DESTROY` when `enableAutoDelete` is `true`
- **Billing Mode**: All tables use `PAY_PER_REQUEST` billing mode for cost optimization
- **Tagging**: All tables are automatically tagged with `TenantId` and `Environment` for resource management

## Tenant S3 Buckets

The tenant deployment creates three dedicated S3 buckets for each tenant with globally unique naming:

### Bucket Naming Convention

All buckets follow a deterministic, globally unique pattern to comply with AWS S3 requirements:

```
{BucketBaseName}-{environment}-tenant-{tenantId}-{guidHash}
```

**Structure breakdown:**

1. `{BucketBaseName}`: Base name (e.g., 'docs', 'chat', 'analytics')
2. `{environment}`: Environment name (e.g., 'dev', 'staging', 'prod')
3. `tenant-`: Fixed prefix to identify tenant resources
4. `{tenantId}`: Sanitized tenant identifier
5. `{guidHash}`: SHA256 hash of "{bucketBaseName}-{environment}-{tenantId}-{accountId}-{region}" truncated to remaining space

**Key Features:**

- **Maximum Length**: 63 characters (AWS S3 limit)
- **Deterministic**: Same inputs always produce the same bucket name (idempotent deployments)
- **Hash Strategy**: SHA256-based hashing using AWS account ID and region for uniqueness
- **No Duplicates**: Prevents duplicate buckets on re-deployment
- **Sanitization**: Special characters in tenant IDs are automatically replaced with hyphens
- **Case**: All bucket names are lowercase

**Example:**

```
docs-dev-tenant-my-tenant-a1b2c3d4e5f6789012345678
├── docs: BucketBaseName
├── dev: Environment
├── tenant-: Fixed prefix
├── my-tenant: TenantId
└── a1b2c3d4e5f6789012345678: GuidHash (truncated for remaining space)
```

### Documents Bucket

- **Purpose**: Storage for RAG/knowledge base documents and files
- **Base Name**: `docs` (configurable)
- **Features**: Versioning, encryption, secure backend access
- **Use Cases**: Document uploads, knowledge base content, RAG data sources

### Chat Bucket

- **Purpose**: Storage for chat attachments and uploaded files
- **Base Name**: `chat` (configurable)
- **Features**: Versioning, encryption, secure backend access
- **Use Cases**: File attachments in conversations, temporary uploads, shared media

### Analytics Bucket

- **Purpose**: Storage for usage analytics, reports, and metrics data
- **Base Name**: `analytics` (configurable)
- **Features**: Backend-only access, versioning, encryption
- **Use Cases**: Usage statistics, system metrics, audit logs, reporting data

### Security Features

- **Encryption**: S3-managed server-side encryption (SSE-S3) enabled by default
- **Public Access**: Complete public access blocking for all buckets
- **SSL/TLS**: HTTPS-only access enforced for all operations
- **Versioning**: Object versioning enabled for data protection
- **Object Ownership**: Bucket owner enforced for improved security

## Stack Naming

Tenant stacks are named using the following patterns:

### DynamoDB Stack

- Pattern: `TenantDynamoDBStack{environment}-{tenantId}`
- Examples:
  - Development: `TenantDynamoDBStackdev-tenant123`
  - Production: `TenantDynamoDBStackprod-tenant123`

### S3 Stack

- Pattern: `TenantS3Stack{environment}-{tenantId}`
- Examples:
  - Development: `TenantS3Stackdev-tenant123`
  - Production: `TenantS3Stackprod-tenant123`

## Adding More Tenant Stacks

To add more tenant-specific stacks:

1. Create a new stack class in `packages/cdk/lib/stacks/tenant/`
2. Import and instantiate it in `packages/cdk/lib/create-tenant-stacks.ts`
3. Deploy using the same pattern as above

## Best Practices

1. **Naming Convention**: Use consistent naming for tenant resources including environment and tenant ID
2. **Resource Naming**:
   - DynamoDB tables: `{BaseTableName}-{environment}-tenant-{tenantId}`
   - S3 buckets: `{BaseBucketName}-{environment}-tenant-{tenantId}-{guidHash}`
3. **Environment Isolation**: Use different environments (dev, staging, prod) for proper lifecycle management
4. **Deletion Protection**: Use `enableAutoDelete: false` for production deployments to prevent accidental deletion
5. **Resource Tagging**: All tenant resources are automatically tagged for cost tracking and management
6. **Security**:
   - S3 buckets are configured with encryption and public access blocking by default
   - All buckets use deterministic naming for predictable, secure deployments
7. **Testing**: Always test tenant stack deployments in a development environment first with `enableAutoDelete: true`
8. **Monitoring**: Monitor S3 bucket usage and DynamoDB performance for cost optimization
9. **Documentation**: Document any tenant-specific configurations or requirements
