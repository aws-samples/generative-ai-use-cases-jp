# Design: Tenant-Aware IP Restriction

## Architecture Overview

This design extends the existing global IP restriction mechanism to support per-tenant configuration while maintaining backward compatibility. The approach stores tenant-specific IP restrictions in the Tenants DynamoDB table and deploys them through the tenant stack deployment process.

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                     Current Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  cdk.json (Global Config)                                        │
│    └─ allowedIpV4AddressRanges ──┐                              │
│    └─ allowedIpV6AddressRanges   │                              │
│                                   │                              │
│                                   ↓                              │
│                        CommonWebAcl (WAF)                        │
│                                   │                              │
│                                   ↓                              │
│                    CloudFront / API Gateway                      │
│                                   │                              │
│                                   ↓                              │
│                         Lambda Functions                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Proposed Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  cdk.json (Global Config)        cdk.tenant.json (Tenant Config) │
│    └─ allowedIpV4AddressRanges     └─ ipAccessControl           │
│    └─ allowedIpV6AddressRanges         ├─ enabled               │
│            │                            ├─ allowedIpV4...        │
│            │                            └─ allowedIpV6...        │
│            │                                    │                │
│            ↓                                    ↓                │
│     CommonWebAcl (WAF)              Tenants Table (DynamoDB)     │
│     (Layer 1: Global)                          │                │
│            │                                    │                │
│            ↓                                    ↓                │
│      API Gateway ──────────→ Lambda Request Authorizer           │
│                               (Layer 2: Tenant-Specific)         │
│                                    │                             │
│                                    ├─ Verify JWT (Cognito)       │
│                                    ├─ Extract Tenant ID          │
│                                    ├─ Get IP Config (DynamoDB)   │
│                                    ├─ Extract Client IP          │
│                                    └─ Check IP Range             │
│                                          │                       │
│                                          ↓                       │
│                                   Allow / Deny                   │
│                                          │                       │
│                                          ↓                       │
│                                 Lambda Functions                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Decision 1: Configuration Storage Location

**Options Considered:**

1. **Store in Tenants DynamoDB Table** (Selected)
   - **Pros:**
     - Single source of truth for all tenant metadata
     - Easy to query and update
     - Consistent with existing tenant management pattern
     - No additional infrastructure required
   - **Cons:**
     - Requires DynamoDB read for IP restriction checks
     - No built-in versioning

2. **Store in Parameter Store/Secrets Manager**
   - **Pros:**
     - Built-in versioning
     - Encryption at rest
   - **Cons:**
     - Additional AWS service dependency
     - Higher cost per parameter
     - Inconsistent with existing tenant data storage

3. **Store in S3**
   - **Pros:**
     - Version control through S3 versioning
     - Lower cost for large configurations
   - **Cons:**
     - Slower access time
     - Requires additional bucket management
     - Overkill for simple configuration data

**Rationale:** The Tenants DynamoDB table is the established pattern for tenant metadata in this system. It provides fast access, scales automatically, and maintains consistency with existing architecture.

### Decision 2: Configuration Schema Design

**Selected Approach:**
```typescript
interface Tenant {
  ipAccessControl?: {
    enabled: boolean;
    allowedIpV4AddressRanges: string[];  // IPv4 CIDR (e.g., ["203.0.113.0/24"])
    allowedIpV6AddressRanges: string[];  // IPv6 CIDR (e.g., ["2001:db8::/32"])
    updatedAt: string;
    updatedBy: string;
  };
}
```

**Rationale:**
- **Separate arrays for IPv4 and IPv6:** Clearer examples, matches global config pattern
- **Explicit protocol separation:** Users immediately understand which addresses go where
- **Optional field:** Maintains backward compatibility
- **`enabled` flag:** Allows explicit disabling without removing configuration
- **Audit fields (`updatedAt`, `updatedBy`):** Tracks changes for compliance

**Example Configuration:**
```json
{
  "context": {
    "tenantId": "tenant-001",
    "ipAccessControl": {
      "enabled": true,
      "allowedIpV4AddressRanges": ["203.0.113.0/24", "198.51.100.50/32"],
      "allowedIpV6AddressRanges": ["2001:db8::/32"]
    }
  }
}
```

**Alternatives Considered:**

```typescript
// Alternative 1: Merged array (combined IPv4 + IPv6)
interface Tenant {
  ipAccessControl?: {
    enabled: boolean;
    allowedIpRanges: string[];  // Combined IPv4 + IPv6
    updatedAt: string;
    updatedBy: string;
  };
}
```
**Rejected:** Less clear in examples, doesn't match global config pattern

```typescript
// Alternative 2: Use existing metadata field
interface Tenant {
  metadata?: {
    ipAccessControl?: { /* ... */ };
  };
}
```
**Rejected:** IP restrictions are first-class security configuration, not generic metadata

### Decision 3: Deployment Flow

**Selected Approach: CDK Tenant Stack Integration**

```
Developer → cdk.tenant.json → CDK Synthesis → Custom Resource
                                                    ↓
                                            Tenants Table Update
```

**Flow Steps:**
1. Operator edits `cdk.tenant.json` with IP restrictions
2. CDK tenant stack synthesizes CloudFormation template
3. CloudFormation deploys/updates tenant resources
4. Custom Resource Lambda (or direct CDK construct) writes to Tenants table
5. IP restrictions are persisted and ready for future enforcement

**Rationale:**
- Leverages existing tenant deployment workflow
- Infrastructure-as-code approach
- Automated and repeatable
- Validated at synthesis time

**Alternative Considered: Post-Deployment API Update**
- **Rejected:** Requires manual step after deployment, not fully automated

### Decision 4: Validation Strategy

**Selected Approach: CDK Synthesis-Time Validation**

Validation occurs in TypeScript during CDK synthesis using:
- Node.js `net.isIP()` for IP validation
- Custom CIDR validation logic
- Zod schema validation (consistent with existing `stack-input.ts`)

**Rationale:**
- Fail fast: Errors detected before CloudFormation deployment
- Consistent with existing validation in `stack-input.ts`
- No runtime overhead
- Clear error messages in CDK output

**Code Location:**
- Extend `packages/cdk/lib/stack-input.ts` with tenant schema validation
- Reuse validation logic from global IP restriction validation

### Decision 5: Backward Compatibility Strategy

**Strategy:**
1. **Optional Field:** `ipAccessControl` is optional on `Tenant` interface
2. **Graceful Degradation:** Code handles missing field as "no restrictions"
3. **No Migration Required:** Existing tenants continue working without changes
4. **Global Restrictions Unchanged:** Global WAF rules continue to apply

**Compatibility Matrix:**

| Scenario | Global IP Restrictions | Tenant IP Restrictions | Result |
|----------|------------------------|------------------------|--------|
| Legacy tenant | Configured | Not configured | Global WAF applies |
| New tenant | Not configured | Configured | Only tenant restrictions (future enforcement) |
| Both configured | Configured | Configured | Both apply (layered security) |
| Neither configured | Not configured | Not configured | No IP restrictions |

## Data Flow

### Deployment Time
```
cdk.tenant.json
    │
    ├─ Read by: generative-ai-use-cases-tenant.ts
    │
    ├─ Validate: IP CIDR notation, schema compliance
    │
    ├─ Transform: Merge IPv4 + IPv6 into single allowedIpRanges array
    │
    └─ Store: Write to Tenants DynamoDB table via CDK Custom Resource
                 or tenant registration handler update
```

### Runtime Enforcement Flow
```
API Request → CloudFront/WAF (Layer 1: Global IP/Country Restrictions)
                 │
                 ↓ (if allowed)
           API Gateway
                 │
                 ↓
         Lambda Request Authorizer (Layer 2: Tenant-Specific Enforcement)
                 │
                 ├─ Extract JWT from Authorization header
                 ├─ Verify JWT signature (Cognito JWKS)
                 ├─ Extract tenant ID from custom:tenant_id claim
                 │
                 ├─ Get tenant config from Tenants table
                 │  (Cached for 5 minutes by API Gateway)
                 │
                 ├─ Check ipAccessControl.enabled
                 │   └─ If false or missing → Allow
                 │
                 ├─ Extract client IP from X-Forwarded-For header
                 │
                 └─ Match IP against allowedIpV4/V6AddressRanges
                       │
                       ├─ Match found → Generate Allow Policy
                       │                    ↓
                       │              Pass to Lambda Function
                       │
                       └─ No match → Generate Deny Policy
                                         ↓
                                    Return 403 Forbidden
                                    (Log to CloudWatch)
```

## Component Design

### Modified Components

#### 1. `packages/cdk/bin/generative-ai-use-cases-tenant.ts`
**Changes:**
- Add `ipAccessControl` to `TenantConfig` interface
- Read IP access control from `cdk.tenant.json`
- Pass to tenant stack creation

#### 2. `packages/cdk/lib/create-tenant-stacks.ts`
**Changes:**
- Accept IP access control configuration
- Pass to tenant registration or update logic

#### 3. `packages/cdk/lambda/tenantManager.ts`
**Changes:**
- Extend `Tenant` interface with `ipAccessControl` field
- Update `registerTenant()` to accept IP access control
- Update `updateTenant()` to support IP access control updates

#### 4. `packages/types/src/tenant.d.ts`
**Changes:**
- Add `ipAccessControl` type definition to shared types

#### 5. `packages/cdk/lib/construct/api/index.ts`
**Changes:**
- **Remove** Cognito User Pools Authorizer
- **Add** Lambda Request Authorizer configuration
- Configure authorizer cache TTL (5 minutes)
- Pass Cognito User Pool details to Lambda Authorizer via environment variables

### New Components

#### 1. Lambda Request Authorizer
**Location:** `packages/cdk/lambda/authorizer.ts`
**Purpose:** Enforce tenant-specific IP restrictions at API Gateway level

**Key Functions:**
- `handler(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult>`
  - Main Lambda handler for authorization requests

**Internal Logic:**
1. **JWT Verification**
   - Extract JWT from Authorization header
   - Fetch Cognito JWKS (JSON Web Key Set)
   - Verify JWT signature
   - Extract claims (`custom:tenant_id`, `cognito:username`)

2. **Tenant Configuration Retrieval**
   - Query Tenants DynamoDB table using tenant ID
   - Handle missing tenant gracefully (deny access)

3. **IP Restriction Check**
   - Check if `ipAccessControl.enabled` is true
   - If false/missing, skip IP check (allow)
   - Extract client IP from `X-Forwarded-For` header (first IP in list)
   - Check IP against both `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges`
   - Use `ip-range-check` library for CIDR matching

4. **Policy Generation**
   - **Allow Policy**: Include tenant context for downstream Lambdas
   - **Deny Policy**: Return explicit deny (403 Forbidden)
   - Log denied requests to CloudWatch

**Dependencies:**
- `aws-jwt-verify` - Cognito JWT verification
- `ip-range-check` - IP range matching
- `@aws-sdk/client-dynamodb` - Tenants table access

**Environment Variables:**
- `USER_POOL_ID` - Cognito User Pool ID
- `TENANTS_TABLE_NAME` - DynamoDB table name
- `AWS_REGION` - AWS region

**Caching:**
- API Gateway caches authorization results for 5 minutes
- Reduces DynamoDB reads and Lambda invocations
- Cache key based on Authorization header

#### 2. IP Validation Utility
**Location:** `packages/cdk/lib/utils/ip-validation.ts`
**Purpose:** Centralized IP range validation for deployment-time checks

**Functions:**
- `validateIpRange(range: string): boolean`
  - Validates single IP range in CIDR notation
  - Supports IPv4 (0.0.0.0/0 to 255.255.255.255/32)
  - Supports IPv6 (2001:db8::/32 format)

- `validateIpRanges(ranges: string[]): { valid: boolean; errors: string[] }`
  - Validates array of IP ranges
  - Returns all validation errors

**Implementation:**
- Uses Node.js `net.isIP()` for IP address validation
- Custom logic for CIDR prefix validation

**Usage:**
- Called during CDK synthesis
- Fails deployment if invalid IP ranges detected

## Trade-offs

### Trade-off 1: Deployment-Time vs. Runtime Configuration

**Selected: Deployment-Time via CDK**
- **Advantage:** Infrastructure-as-code, version controlled, validated early
- **Disadvantage:** Requires redeployment to update IP restrictions

**Alternative: Runtime API**
- **Advantage:** Dynamic updates without redeployment
- **Disadvantage:** Not tracked in source control, requires additional API endpoints

**Decision:** Start with deployment-time configuration for simplicity. Runtime API can be added later if needed.

### Trade-off 2: Merged IP Array vs. Separate Arrays

**Selected: Separate Arrays (`allowedIpV4AddressRanges` and `allowedIpV6AddressRanges`)**
- **Advantage:** Matches global config pattern, clearer examples for users
- **Advantage:** Explicit protocol separation - immediately clear which addresses go where
- **Disadvantage:** Slightly more verbose

**Alternative: Merged Array (`allowedIpRanges: string[]`)**
- **Advantage:** Simpler schema, single validation path
- **Disadvantage:** Less clear in examples, doesn't match existing global config pattern

**Decision:** Use separate arrays for clarity and consistency with existing global IP restriction configuration.

### Trade-off 3: Fail-Safe Behavior for Empty Restrictions

**Selected: Empty IP ranges with `enabled: true` = Deployment Error**

**Validation Rules:**
1. If `ipAccessControl.enabled === true`:
   - **MUST** have at least one IP range in `allowedIpV4AddressRanges` OR `allowedIpV6AddressRanges`
   - Empty arrays on both = **Deployment fails with validation error**

2. If `ipAccessControl.enabled === false`:
   - IP ranges ignored (can be empty or populated)
   - No IP restriction enforcement

3. If `ipAccessControl` field missing entirely:
   - No IP restriction enforcement
   - Tenant functions normally

**Rationale:**
- Security-critical configuration requires explicit values
- Prevents accidental lockout or misconfiguration
- Clear error message guides user to correct configuration

## Security Considerations

### Threat: Configuration Injection
**Mitigation:** Schema validation at synthesis time, type-safe CDK constructs

### Threat: DynamoDB Data Tampering
**Mitigation:** IAM policies restrict write access, CloudTrail logging for audit

### Threat: IP Spoofing
**Mitigation:** Out of scope for this change. Runtime enforcement (Lambda Authorizer) must use trusted headers (X-Forwarded-For from CloudFront).

## Performance Considerations

### DynamoDB Read Performance
- **Impact:** IP restrictions read from DynamoDB during runtime enforcement (future)
- **Mitigation:** Lambda Authorizer caching (5-minute TTL recommended)
- **Cost:** Minimal - GetItem operation, On-Demand pricing

### CDK Deployment Performance
- **Impact:** Negligible - IP configuration is small data
- **Mitigation:** None required

## Testing Strategy

### Unit Tests
- IP range validation (valid/invalid CIDR notation)
- Schema validation (Zod schema tests)
- Tenant interface type checking

### Integration Tests
- Deploy tenant with IP restrictions
- Update tenant IP restrictions
- Deploy tenant without IP restrictions (backward compatibility)

### Validation Tests
- Invalid IP ranges rejected at synthesis time
- Invalid schema rejected at synthesis time

## Migration Path

### Phase 1: Infrastructure (This Change)
1. Add IP restriction fields to tenant configuration
2. Store in Tenants DynamoDB table
3. Validate during deployment

### Phase 2: Runtime Enforcement (Future Change)
1. Implement Lambda Request Authorizer
2. Read IP restrictions from Tenants table
3. Enforce IP restrictions at API Gateway level

### Phase 3: Management Features (Future Change)
1. Add API endpoints for updating IP restrictions
2. Add frontend UI for tenant administrators
3. Add audit logging and reporting

## Open Questions

### Q1: Inheritance Behavior
**Question:** Should tenants without IP restrictions inherit global restrictions?

**Options:**
- **A:** Inherit global restrictions (layered security)
- **B:** No inheritance (tenant-specific only)
- **C:** Configurable inheritance flag

**Recommendation:** Defer to runtime enforcement design. For this change, simply store configuration.

### Q2: Empty Allowed Ranges
**Question:** How to handle `enabled: true` with empty `allowedIpRanges`?

**Options:**
- **A:** Treat as deny-all (legitimate lockdown scenario)
- **B:** Treat as allow-all (fallback to no restrictions)
- **C:** Reject as invalid configuration

**Recommendation:** Option C (reject as invalid) for safety. Explicit configuration required.

### Q3: Validation Timing
**Question:** Should validation happen at CDK synthesis or CloudFormation deployment?

**Options:**
- **A:** Synthesis time (fail fast, clear errors)
- **B:** Deployment time (custom resource validation)
- **C:** Both (defense in depth)

**Recommendation:** Option A (synthesis time) for primary validation. Simple and fast feedback.

## Future Enhancements

### 1. Runtime API for IP Restriction Updates
- Add API endpoints: `PUT /admin/tenants/{tenantId}/ip-restrictions`
- Update Tenants table directly
- Emit CloudWatch events for audit

### 2. IP Restriction Templates
- Predefined IP range templates (e.g., "Office Network", "VPN Range")
- Reusable across tenants

### 3. Time-Based Restrictions
- Allow IP restrictions during specific time windows
- Extend schema with schedule configuration

### 4. IP Restriction Reporting
- Dashboard showing which tenants have IP restrictions
- Compliance reports
- Access denial metrics

## References

### Internal Documentation
- `TENANT_IP_RESTRICTION_INVESTIGATION.md` - Detailed investigation and Lambda Authorizer approach
- `packages/cdk/lib/stack-input.ts` - Global IP restriction schema and validation
- `packages/cdk/lib/construct/common-web-acl.ts` - WAF IP restriction implementation

### Related Code
- `packages/cdk/lambda/tenantManager.ts` - Tenant management logic
- `packages/types/src/tenant.d.ts` - Tenant type definitions
- `packages/cdk/bin/generative-ai-use-cases-tenant.ts` - Tenant deployment entry point
