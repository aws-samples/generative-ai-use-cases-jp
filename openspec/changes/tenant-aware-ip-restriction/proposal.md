# Tenant-Aware IP Restriction

## Status
- **ID**: `tenant-aware-ip-restriction`
- **State**: Proposed
- **Created**: 2025-10-30
- **Owner**: System

## Objective
Extend the existing global IP address restriction feature to support per-tenant configuration, enabling each tenant to define their own allowed IP address ranges independently while maintaining backward compatibility with global restrictions.

## Background
Currently, IP address restrictions are configured globally in `cdk.json` through the `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges` parameters. These restrictions are enforced at the WAF (Web Application Firewall) level and apply uniformly to all tenants.

This approach has limitations:
- All tenants share the same IP restrictions
- Cannot accommodate tenant-specific security requirements
- Reduces flexibility for organizations with different network architectures

The investigation documented in `TENANT_IP_RESTRICTION_INVESTIGATION.md` proposes a Lambda Request Authorizer approach, similar to ChatGPT Enterprise's "Tenant Enforcement Layer", which provides granular per-tenant IP control.

## Scope

### In Scope (Phase 1: Configuration + Enforcement)

1. **Tenant Configuration Schema**: Add IP restriction fields to tenant configuration
   - Support for `cdk.tenant.json` configuration file
   - Schema extension for `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges` (separate arrays)
   - Validation of IP ranges at deployment time

2. **Tenant Data Model**: Extend Tenants DynamoDB table
   - Add `ipAccessControl` field structure with `enabled`, `allowedIpV4AddressRanges`, `allowedIpV6AddressRanges`, and metadata
   - Store tenant-specific IP restriction configuration

3. **Deployment Integration**: Deploy tenant IP restrictions through tenant stack
   - Read IP restrictions from `cdk.tenant.json`
   - Store configuration in Tenants table during tenant stack deployment
   - Support updates to IP restrictions

4. **Runtime Enforcement**: Lambda Request Authorizer implementation
   - Replace Cognito User Pools Authorizer with Lambda Request Authorizer
   - Integrate Cognito JWT verification into Lambda Authorizer
   - Extract client IP from X-Forwarded-For header
   - Query Tenants table for IP restrictions
   - Enforce IP restrictions at API Gateway level (return 403 for violations)
   - Cache authorization results (5-minute TTL)
   - Audit logging for denied requests

5. **Layered Security**: Work alongside existing global WAF restrictions
   - Global WAF IP restrictions continue to apply (if configured)
   - Tenant-specific restrictions add additional layer
   - Both must be satisfied for access

6. **Backward Compatibility**: Maintain existing behavior
   - Global WAF restrictions continue to work as before
   - Tenants without IP configuration have no tenant-specific restrictions
   - Empty IP ranges treated as "no restrictions" (not deny-all)

### Out of Scope (Phase 2: Future)
- Interactive UI for tenant administrators to configure IP restrictions
- Management API for updating IP restrictions after deployment (without redeployment)
- Frontend settings page for IP restriction configuration
- Migration tools for existing global restrictions to tenant-specific
- IP restriction reporting and analytics dashboard

### Dependencies
- Requires existing tenant infrastructure (Tenants table, tenant stack deployment)
- Requires Cognito User Pools for JWT verification
- Requires API Gateway REST API with authorizer support

## Approach

### Configuration Flow
1. Operator defines tenant IP restrictions in `cdk.tenant.json`
2. Tenant stack deployment reads configuration
3. Configuration validated (CIDR notation, format)
4. Configuration stored in Tenants DynamoDB table
5. Lambda Authorizer reads from Tenants table on each API request (with caching)

### Runtime Enforcement Flow
```
API Request → API Gateway
                 ↓
          Lambda Request Authorizer
                 ↓
          1. Verify JWT (Cognito)
          2. Extract tenant ID from JWT claims
          3. Get tenant config from Tenants table (cached)
          4. Extract client IP from X-Forwarded-For
          5. Check IP against allowedIpV4/V6AddressRanges
                 ↓
          Allow (200) or Deny (403)
                 ↓
          Lambda Functions (if allowed)
```

### Data Model Extension
Extend the `Tenant` interface to include:

```typescript
interface Tenant {
  // ... existing fields
  ipAccessControl?: {
    enabled: boolean;
    allowedIpV4AddressRanges: string[];  // CIDR notation (e.g., ["203.0.113.0/24"])
    allowedIpV6AddressRanges: string[];  // CIDR notation (e.g., ["2001:db8::/32"])
    updatedAt: string;                   // ISO 8601 timestamp
    updatedBy: string;                   // Deployment identifier
  };
}
```

### Alternative Approaches Considered

#### Alternative 1: Direct WAF Integration
- **Approach**: Create tenant-specific WAF IP sets
- **Rejected**: Complexity of managing multiple IP sets, WAF cost scaling, update latency
- **Trade-off**: Simpler deployment model vs. higher operational complexity

#### Alternative 2: Application-Level Enforcement Only
- **Approach**: Skip CDK configuration, manage only through runtime API
- **Rejected**: Requires manual setup for each tenant, no infrastructure-as-code benefits
- **Trade-off**: More flexibility vs. loss of deployment automation

## Success Criteria
1. Tenant stack can be deployed with IP restrictions specified in `cdk.tenant.json`
2. IP restriction configuration is persisted to Tenants DynamoDB table
3. Configuration schema is validated during deployment
4. Lambda Request Authorizer successfully enforces IP restrictions at runtime
5. API requests from allowed IPs are permitted (200 response)
6. API requests from non-allowed IPs are denied (403 response)
7. Tenants without IP configuration can access normally
8. Empty IP ranges result in no tenant-specific restrictions
9. Global WAF restrictions continue to function (layered security)
10. Authorization results are cached to minimize DynamoDB reads
11. JWT verification works correctly in Lambda Authorizer
12. Audit logs capture denied access attempts
13. No breaking changes to existing tenant deployments

## Risks and Mitigations

### Risk: Schema Mismatch
- **Issue**: Inconsistent IP restriction format between global and tenant config
- **Mitigation**: Use same schema structure, share validation logic

### Risk: Deployment Failures
- **Issue**: Invalid IP ranges cause tenant stack deployment to fail
- **Mitigation**: Implement comprehensive validation in CDK constructs

### Risk: Configuration Drift
- **Issue**: Tenants table data diverges from deployed infrastructure
- **Mitigation**: Deployment-time reconciliation, clear documentation of update procedures

## Design Decisions (Resolved)

### 1. Empty IP Ranges Behavior
**Decision:** Empty arrays mean "no restrictions" (not deny-all)
- Rationale: Simpler mental model, safer default
- `enabled: false` or missing configuration = no restrictions
- Empty arrays = no restrictions (treated same as missing)

### 2. Global + Tenant Restrictions Interaction
**Decision:** Layered security (both apply)
- Global WAF restrictions continue to operate (if configured)
- Tenant-specific Lambda Authorizer adds additional layer
- Request must satisfy BOTH to succeed
- Rationale: Defense-in-depth, no need to modify existing WAF code

### 3. IP Array Structure
**Decision:** Separate `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges`
- Rationale: Clearer examples, matches global config pattern
- Easier for users to understand
- Explicit protocol separation

### 4. Enforcement Scope
**Decision:** Include Lambda Authorizer in Phase 1
- Rationale: Not shipped yet, can deliver complete feature
- Phase 1 = Configuration + Enforcement
- Phase 2 = Interactive UI (cdk config becomes initial value)

## Open Questions
1. Should Lambda Authorizer cache TTL be configurable per tenant or global?
2. What audit log format is needed for compliance requirements?
3. Should we support IP allowlist updates via CloudWatch Events for emergency access?

## Related Changes
- **Phase 2 (Future)**: Interactive UI for tenant administrators to configure IP restrictions
- **Phase 2 (Future)**: Management API for updating IP restrictions without redeployment
- **Phase 2 (Future)**: IP restriction analytics and reporting dashboard
