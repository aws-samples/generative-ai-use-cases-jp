# Tenant IP Configuration

## Capability Overview
Enable per-tenant IP address restriction configuration through tenant deployment configuration files and persistent storage in the Tenants DynamoDB table.

## ADDED Requirements

### Requirement: Tenant Configuration File Schema
The tenant configuration file (`cdk.tenant.json`) MUST support IP restriction configuration fields with separate IPv4 and IPv6 arrays.

#### Scenario: Configure tenant with IPv4 restrictions only
**Given** a tenant deployment with `cdk.tenant.json` file
**When** the configuration includes:
```json
{
  "context": {
    "tenantId": "tenant-001",
    "ipAccessControl": {
      "enabled": true,
      "allowedIpV4AddressRanges": ["203.0.113.0/24", "198.51.100.50/32"],
      "allowedIpV6AddressRanges": []
    }
  }
}
```
**Then** the deployment MUST accept this configuration
**And** the configuration MUST be validated for correct CIDR notation
**And** runtime enforcement MUST allow IPv4 addresses within specified ranges
**And** runtime enforcement MUST deny IPv4 addresses outside specified ranges

#### Scenario: Configure tenant with IPv6 restrictions only
**Given** a tenant deployment with `cdk.tenant.json` file
**When** the configuration includes:
```json
{
  "context": {
    "tenantId": "tenant-001",
    "ipAccessControl": {
      "enabled": true,
      "allowedIpV4AddressRanges": [],
      "allowedIpV6AddressRanges": ["2001:db8::/32"]
    }
  }
}
```
**Then** the deployment MUST accept this configuration
**And** the configuration MUST be validated for correct IPv6 CIDR notation
**And** runtime enforcement MUST allow IPv6 addresses within specified ranges
**And** runtime enforcement MUST deny IPv6 addresses outside specified ranges

#### Scenario: Configure tenant with mixed IPv4 and IPv6 restrictions
**Given** a tenant deployment with `cdk.tenant.json` file
**When** the configuration includes both IPv4 and IPv6 ranges:
```json
{
  "context": {
    "tenantId": "tenant-001",
    "ipAccessControl": {
      "enabled": true,
      "allowedIpV4AddressRanges": ["203.0.113.0/24"],
      "allowedIpV6AddressRanges": ["2001:db8::/32"]
    }
  }
}
```
**Then** the deployment MUST accept and store both configurations
**And** runtime enforcement MUST check both IPv4 and IPv6 ranges appropriately

#### Scenario: Deploy tenant without IP restrictions
**Given** a tenant deployment with `cdk.tenant.json` file
**When** the configuration does not include `ipAccessControl` field
**Then** the deployment MUST succeed
**And** no IP restrictions MUST be stored for that tenant

#### Scenario: Disable IP restrictions for tenant
**Given** a tenant deployment with `cdk.tenant.json` file
**When** the configuration includes:
```json
{
  "context": {
    "tenantId": "tenant-001",
    "ipAccessControl": {
      "enabled": false
    }
  }
}
```
**Then** the deployment MUST succeed
**And** the tenant's IP restrictions MUST be marked as disabled

### Requirement: Tenants Table Schema Extension
The Tenants DynamoDB table MUST store per-tenant IP restriction configuration with separate IPv4 and IPv6 arrays.

#### Scenario: Store IP restriction configuration
**Given** a tenant with IP restrictions configured in `cdk.tenant.json`
**When** the tenant stack is deployed
**Then** the Tenants table entry MUST include:
```json
{
  "tenantId": "tenant-001",
  "ipAccessControl": {
    "enabled": true,
    "allowedIpV4AddressRanges": ["203.0.113.0/24", "198.51.100.50/32"],
    "allowedIpV6AddressRanges": ["2001:db8::/32"],
    "updatedAt": "2025-10-30T12:00:00Z",
    "updatedBy": "cdk-deployment"
  }
}
```
**And** the `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges` MUST be stored as separate fields

#### Scenario: Update existing tenant IP restrictions
**Given** a tenant with existing IP restrictions in the Tenants table
**When** the tenant stack is redeployed with updated IP restrictions
**Then** the Tenants table entry MUST be updated with new values
**And** the `updatedAt` timestamp MUST be updated
**And** existing tenant data MUST be preserved

#### Scenario: Remove IP restrictions from tenant
**Given** a tenant with existing IP restrictions in the Tenants table
**When** the tenant stack is redeployed without `ipAccessControl` in configuration
**Then** the deployment MUST preserve existing IP restrictions
**Or** the deployment MUST explicitly remove IP restrictions if configuration specifies removal

### Requirement: IP Range Validation
The system MUST validate IP address ranges during deployment.

#### Scenario: Reject invalid IPv4 CIDR notation
**Given** a tenant configuration with IP restrictions
**When** the configuration includes invalid IPv4 CIDR notation (e.g., "256.1.1.1/24")
**Then** the deployment MUST fail with a validation error
**And** the error message MUST indicate the invalid IP range

#### Scenario: Reject invalid IPv6 CIDR notation
**Given** a tenant configuration with IP restrictions
**When** the configuration includes invalid IPv6 CIDR notation (e.g., "gggg::/32")
**Then** the deployment MUST fail with a validation error
**And** the error message MUST indicate the invalid IP range

#### Scenario: Reject invalid prefix length
**Given** a tenant configuration with IP restrictions
**When** the configuration includes invalid prefix length (e.g., "192.0.2.0/33" for IPv4)
**Then** the deployment MUST fail with a validation error
**And** the error message MUST indicate the invalid prefix length

#### Scenario: Accept valid single IP address
**Given** a tenant configuration with IP restrictions
**When** the configuration includes a single IP address without prefix (e.g., "192.0.2.1")
**Then** the deployment MUST treat it as "/32" for IPv4 or "/128" for IPv6
**Or** the deployment MUST require explicit CIDR notation

### Requirement: Deployment Integration
The tenant stack deployment MUST integrate IP restriction configuration.

#### Scenario: Deploy new tenant with IP restrictions
**Given** a new tenant being deployed
**When** the `cdk.tenant.json` includes IP restrictions
**Then** the tenant stack MUST be created successfully
**And** the Tenants table MUST contain the IP restriction configuration
**And** the deployment output MUST confirm IP restrictions were applied

#### Scenario: Update tenant stack with new IP restrictions
**Given** an existing deployed tenant stack
**When** the `cdk.tenant.json` is updated with new IP restrictions
**And** the tenant stack is redeployed
**Then** the Tenants table MUST be updated with new IP restrictions
**And** the stack update MUST complete successfully

#### Scenario: Reject empty IP ranges when enabled
**Given** a tenant configuration with `ipAccessControl.enabled = true`
**When** both `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges` are empty arrays
**Then** the deployment MUST fail with a validation error
**And** the error message MUST indicate that at least one IP range is required when IP restrictions are enabled

### Requirement: TypeScript Type Definitions
The system MUST provide TypeScript type definitions for IP restriction configuration.

#### Scenario: Type-safe configuration in CDK code
**Given** TypeScript CDK code for tenant deployment
**When** developers reference IP restriction configuration
**Then** the TypeScript compiler MUST provide type checking
**And** IDE autocomplete MUST suggest available IP restriction fields

#### Scenario: Type definitions match DynamoDB schema
**Given** the Tenant interface in TypeScript
**When** developers work with tenant data from DynamoDB
**Then** the TypeScript types MUST match the DynamoDB schema
**And** the types MUST include optional `ipAccessControl` field

### Requirement: Lambda Request Authorizer Runtime Enforcement
The system MUST enforce tenant-specific IP restrictions at the API Gateway level using a Lambda Request Authorizer.

#### Scenario: Allow request from permitted IP address
**Given** a tenant with IP access control enabled
**And** the tenant's `allowedIpV4AddressRanges` includes "203.0.113.0/24"
**When** an API request arrives from IP "203.0.113.50"
**And** the request includes a valid JWT with the tenant's ID
**Then** the Lambda Authorizer MUST generate an Allow policy
**And** the request MUST be forwarded to the Lambda function
**And** the response status MUST be 200 (or appropriate success code)

#### Scenario: Deny request from non-permitted IP address
**Given** a tenant with IP access control enabled
**And** the tenant's `allowedIpV4AddressRanges` includes "203.0.113.0/24"
**When** an API request arrives from IP "198.51.100.50" (not in allowed range)
**And** the request includes a valid JWT with the tenant's ID
**Then** the Lambda Authorizer MUST generate a Deny policy
**And** the API Gateway MUST return HTTP 403 Forbidden
**And** the denied request MUST be logged to CloudWatch Logs

#### Scenario: Allow request when IP restrictions disabled
**Given** a tenant with `ipAccessControl.enabled = false`
**When** an API request arrives from any IP address
**And** the request includes a valid JWT with the tenant's ID
**Then** the Lambda Authorizer MUST skip IP restriction checks
**And** the Lambda Authorizer MUST generate an Allow policy (assuming JWT is valid)
**And** the request MUST be forwarded to the Lambda function

#### Scenario: Allow request when IP restrictions not configured
**Given** a tenant without `ipAccessControl` field in Tenants table
**When** an API request arrives from any IP address
**And** the request includes a valid JWT with the tenant's ID
**Then** the Lambda Authorizer MUST skip IP restriction checks
**And** the Lambda Authorizer MUST generate an Allow policy (assuming JWT is valid)
**And** the request MUST be forwarded to the Lambda function

#### Scenario: Extract client IP from X-Forwarded-For header
**Given** an API request passing through CloudFront
**When** the request includes header `X-Forwarded-For: 203.0.113.50, 10.0.0.1, 172.16.0.1`
**Then** the Lambda Authorizer MUST extract "203.0.113.50" as the client IP
**And** the Lambda Authorizer MUST use only the first IP in the comma-separated list

#### Scenario: Verify JWT signature using Cognito JWKS
**Given** an API request with Authorization header containing a JWT
**When** the Lambda Authorizer processes the request
**Then** the authorizer MUST fetch the Cognito JWKS (JSON Web Key Set)
**And** the authorizer MUST verify the JWT signature against the JWKS
**And** the authorizer MUST extract `custom:tenant_id` claim from the JWT
**And** the authorizer MUST deny access if JWT verification fails

#### Scenario: Cache authorization results
**Given** a tenant with IP restrictions configured
**When** multiple API requests arrive from the same user (same JWT)
**Then** the API Gateway MUST cache the authorization result
**And** subsequent requests within 5 minutes MUST use cached result
**And** the Lambda Authorizer MUST NOT be invoked for cached requests

#### Scenario: Layered security with global WAF restrictions
**Given** global WAF IP restrictions configured in `cdk.json`
**And** a tenant with tenant-specific IP restrictions configured
**When** an API request arrives
**Then** the request MUST satisfy global WAF restrictions (Layer 1)
**And** the request MUST satisfy tenant-specific Lambda Authorizer restrictions (Layer 2)
**And** both layers MUST pass for the request to succeed

#### Scenario: Handle tenant not found in Tenants table
**Given** an API request with a valid JWT
**And** the JWT contains `custom:tenant_id` claim with value "non-existent-tenant"
**When** the Lambda Authorizer queries the Tenants table
**And** no tenant record is found
**Then** the Lambda Authorizer MUST generate a Deny policy
**And** the API Gateway MUST return HTTP 403 Forbidden
**And** the error MUST be logged to CloudWatch Logs

## MODIFIED Requirements

### Requirement: Tenant Interface Extension
The existing `Tenant` interface MUST be extended to include IP access control.

**Before**:
```typescript
interface Tenant {
  tenantId: string;
  status: TenantStatus;
  region: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  accountId: string;
  roleArn: string;
}
```

**After**:
```typescript
interface Tenant {
  tenantId: string;
  status: TenantStatus;
  region: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  accountId: string;
  roleArn: string;
  ipAccessControl?: {
    enabled: boolean;
    allowedIpV4AddressRanges: string[];  // IPv4 CIDR (e.g., ["203.0.113.0/24"])
    allowedIpV6AddressRanges: string[];  // IPv6 CIDR (e.g., ["2001:db8::/32"])
    updatedAt: string;
    updatedBy: string;
  };
}
```

#### Scenario: Maintain backward compatibility with existing tenant records
**Given** existing tenant records in DynamoDB without `ipAccessControl` field
**When** application code reads these tenant records
**Then** the application MUST handle missing `ipAccessControl` field gracefully
**And** tenants without IP restrictions MUST function normally

## Cross-References
- Related to future capability: `runtime-ip-enforcement` (Lambda Authorizer implementation)
- Builds upon: Existing tenant infrastructure in `packages/cdk/lib/stacks/tenant/`
- Extends: Tenants DynamoDB table schema
