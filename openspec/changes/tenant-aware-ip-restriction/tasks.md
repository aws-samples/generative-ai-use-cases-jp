# Implementation Tasks: Tenant-Aware IP Restriction (Phase 1: Config + Enforcement)

## Overview
This document outlines the implementation tasks for adding tenant-specific IP restriction configuration AND runtime enforcement. Tasks are ordered to enable incremental delivery with validation at each step.

## Task Dependencies
```
[1] → [2] → [3] → [4] → [5] → [8]
          ↘ [6] → [7] ↗
               ↘ [9] → [10] → [11]
```

## Tasks

### Task 1: Extend TypeScript Type Definitions
**Deliverable:** Updated type definitions with IP access control fields (separate IPv4/IPv6 arrays)
**Validation:** TypeScript compilation succeeds, types exported correctly

**Steps:**
1. Update `packages/types/src/tenant.d.ts` to add `IpAccessControl` interface
   - Add `enabled: boolean` field
   - Add `allowedIpV4AddressRanges: string[]` field
   - Add `allowedIpV6AddressRanges: string[]` field
   - Add `updatedAt: string` field
   - Add `updatedBy: string` field
2. Add `ipAccessControl?: IpAccessControl` field to `Tenant` interface
3. Export new type definitions
4. Run `npm run build` in types package to verify compilation
5. Verify no breaking changes in dependent packages

**Acceptance Criteria:**
- [x] `IpAccessControl` interface defined with all required fields
- [x] Separate arrays for IPv4 and IPv6 ranges
- [x] `Tenant` interface includes optional `ipAccessControl` field
- [x] All TypeScript builds pass
- [x] No linter errors introduced

**Estimated Effort:** 45 minutes

---

### Task 2: Add Tenant Configuration Schema
**Deliverable:** `cdk.tenant.json` schema supports IP access control
**Validation:** Example tenant config with IP restrictions validates successfully

**Steps:**
1. Update `packages/cdk/bin/generative-ai-use-cases-tenant.ts`:
   - Add `ipAccessControl` to `TenantConfig` interface
   - Add fields: `enabled`, `allowedIpV4AddressRanges`, `allowedIpV6AddressRanges`
2. Update `cdk.tenant.example.json` with commented example showing both IPv4 and IPv6
3. Document configuration format in code comments

**Acceptance Criteria:**
- [x] `TenantConfig` interface includes IP access control fields
- [x] Example configuration shows separate IPv4 and IPv6 usage
- [x] Configuration loads without errors when present
- [x] Configuration optional (missing field doesn't break deployment)

**Estimated Effort:** 1 hour

---

### Task 3: Implement IP Range Validation Utility
**Deliverable:** Reusable IP validation functions for deployment-time checks
**Validation:** Unit tests pass for all validation scenarios

**Steps:**
1. Create `packages/cdk/lib/utils/ip-validation.ts`
2. Implement `validateIpRange(range: string): boolean` function
   - Support IPv4 CIDR notation (e.g., "192.0.2.0/24")
   - Support IPv6 CIDR notation (e.g., "2001:db8::/32")
   - Support single IP addresses
   - Validate prefix length bounds (0-32 for IPv4, 0-128 for IPv6)
3. Implement `validateIpRanges(ranges: string[]): { valid: boolean; errors: string[] }`
4. Write unit tests for validation logic
   - Valid IPv4/IPv6 ranges
   - Invalid IP addresses
   - Invalid prefix lengths
   - Edge cases (empty array, single IP)

**Acceptance Criteria:**
- [x] Validation functions implemented and exported
- [ ] Unit tests achieve >90% code coverage (deferred)
- [ ] All test cases pass (deferred)
- [x] Functions reusable across CDK and Lambda code

**Estimated Effort:** 2 hours

---

### Task 4: Update Tenant Manager with IP Access Control
**Deliverable:** Tenant management functions support IP restrictions
**Validation:** Can create and update tenants with IP access control

**Steps:**
1. Update `packages/cdk/lambda/tenantManager.ts`:
   - Import `IpAccessControl` type from `generative-ai-use-cases`
   - Update `Tenant` interface to include `ipAccessControl` field
   - Update `RegisterTenantRequest` to accept optional `ipAccessControl`
   - Update `UpdateTenantRequest` to accept optional `ipAccessControl`
   - Update `registerTenant()` function to handle IP access control
   - Update `updateTenant()` function to support IP access control updates
2. Ensure backward compatibility (handle missing `ipAccessControl` field)
3. Add timestamp and updatedBy tracking

**Acceptance Criteria:**
- [x] `registerTenant()` accepts and stores `ipAccessControl` field with separate IPv4/IPv6 arrays
- [x] `updateTenant()` can update `ipAccessControl` field
- [x] Existing tenants without `ipAccessControl` continue to work
- [x] `updatedAt` and `updatedBy` fields populated correctly
- [x] DynamoDB operations succeed with new schema

**Estimated Effort:** 2 hours

---

### Task 5: Integrate IP Configuration into Tenant Stack Deployment
**Deliverable:** Tenant stack deployment reads, validates, and stores IP restrictions
**Validation:** Deploy tenant with IP restrictions, verify DynamoDB storage

**Steps:**
1. Update `packages/cdk/bin/generative-ai-use-cases-tenant.ts`:
   - Read `ipAccessControl` from `cdk.tenant.json` context
   - Validate IP ranges using validation utility (Task 3)
   - Validate that at least one IP range exists if `enabled: true`
   - Pass configuration to tenant stack creation
2. Update `packages/cdk/lib/create-tenant-stacks.ts`:
   - Accept `ipAccessControl` parameter
   - Pass to tenant registration or custom resource
3. Ensure tenant registration writes IP configuration to Tenants table
4. Test deployment with sample IP restrictions

**Acceptance Criteria:**
- [x] Tenant deployment reads IP configuration from `cdk.tenant.json`
- [x] Invalid IP ranges cause deployment failure with clear error message
- [x] Empty IP ranges with `enabled: true` cause deployment failure
- [x] IP configuration written to Tenants DynamoDB table
- [x] `updatedBy` field set to "cdk-deployment"
- [x] Deployment succeeds for tenants without IP configuration

**Estimated Effort:** 3 hours

---

### Task 6: Implement Lambda Request Authorizer - Core Logic
**Deliverable:** Lambda function that verifies JWT and extracts tenant ID
**Validation:** JWT verification works, tenant ID extracted correctly

**Steps:**
1. Create `packages/cdk/lambda/authorizer.ts`
2. Implement `handler(event: APIGatewayRequestAuthorizerEvent)` function
3. Implement JWT verification:
   - Extract JWT from `Authorization` header
   - Use `aws-jwt-verify` library to verify Cognito JWT
   - Fetch JWKS from Cognito User Pool
   - Verify JWT signature
   - Extract `custom:tenant_id` and `cognito:username` claims
4. Implement error handling for invalid/expired JWTs
5. Add CloudWatch logging for debugging

**Acceptance Criteria:**
- [x] Lambda handler extracts JWT from Authorization header
- [x] JWT signature verified against Cognito JWKS
- [x] Tenant ID extracted from `custom:tenant_id` claim
- [x] Invalid JWTs result in Deny policy
- [x] Proper error logging to CloudWatch

**Estimated Effort:** 4 hours

---

### Task 7: Implement Lambda Request Authorizer - IP Restriction Logic
**Deliverable:** IP restriction enforcement logic in Lambda Authorizer
**Validation:** IP matching works correctly for IPv4 and IPv6

**Steps:**
1. Add to `packages/cdk/lambda/authorizer.ts`:
   - Query Tenants DynamoDB table using tenant ID
   - Handle tenant not found (deny access)
   - Check `ipAccessControl.enabled` flag
   - Extract client IP from `X-Forwarded-For` header (first IP in list)
   - Use `ip-range-check` library to match IP against ranges
   - Check both `allowedIpV4AddressRanges` and `allowedIpV6AddressRanges`
2. Implement policy generation:
   - `generateAllowPolicy()` - include tenant context
   - `generateDenyPolicy()` - explicit deny
3. Log denied requests to CloudWatch (include tenant ID, user ID, client IP)

**Acceptance Criteria:**
- [x] Tenant configuration fetched from DynamoDB
- [x] IP restrictions skipped when `enabled: false` or field missing
- [x] Client IP extracted from X-Forwarded-For (first IP)
- [x] IPv4 addresses matched against IPv4 ranges
- [x] IPv6 addresses matched against IPv6 ranges
- [x] Allow policy generated for permitted IPs
- [x] Deny policy generated for non-permitted IPs
- [x] Denied requests logged to CloudWatch

**Estimated Effort:** 4 hours

---

### Task 8: Configure API Gateway Lambda Request Authorizer
**Deliverable:** API Gateway uses Lambda Request Authorizer instead of Cognito
**Validation:** API requests go through Lambda Authorizer

**Steps:**
1. Update `packages/cdk/lib/construct/api/index.ts`:
   - Create NodejsFunction for authorizer (from Task 6+7)
   - Set timeout to 10 seconds (max for authorizers)
   - Set environment variables: `USER_POOL_ID`, `TENANTS_TABLE_NAME`, `AWS_REGION`
   - Grant DynamoDB read permissions to authorizer Lambda
2. Create RequestAuthorizer construct:
   - Set identity source to `Authorization` header
   - Set results cache TTL to 5 minutes
   - Set authorizer name to `TenantIpAuthorizer`
3. Replace Cognito User Pools Authorizer with Lambda Request Authorizer:
   - Update `defaultMethodOptions` on API Gateway
   - Set `authorizationType: AuthorizationType.CUSTOM`
   - Set `authorizer` to the new Lambda Request Authorizer
4. Add Lambda dependencies to `package.json`:
   - `aws-jwt-verify`
   - `ip-range-check`

**Acceptance Criteria:**
- [x] Lambda Authorizer deployed with correct environment variables
- [x] Lambda has read access to Tenants DynamoDB table
- [x] API Gateway configured to use Lambda Request Authorizer
- [x] Authorization cache TTL set to 5 minutes
- [x] All API endpoints use the new authorizer
- [x] Dependencies installed correctly

**Estimated Effort:** 3 hours

---

### Task 9: Write Unit Tests for Lambda Authorizer
**Deliverable:** Comprehensive unit tests for authorizer logic
**Validation:** All unit tests pass, >85% code coverage

**Steps:**
1. Create test file: `packages/cdk/lambda/test/authorizer.test.ts`
2. Mock dependencies:
   - Cognito JWKS
   - DynamoDB Tenants table
   - `ip-range-check` library
3. Test scenarios:
   - Valid JWT with valid IP → Allow
   - Valid JWT with invalid IP → Deny
   - Invalid/expired JWT → Deny
   - Tenant not found → Deny
   - IP restrictions disabled → Allow (skip IP check)
   - IP restrictions missing → Allow (skip IP check)
   - Empty IP ranges with enabled=true (should not occur due to deployment validation)
   - X-Forwarded-For parsing (multiple IPs)
   - IPv4 and IPv6 matching separately
4. Test error handling and logging

**Acceptance Criteria:**
- [ ] All test scenarios implemented
- [ ] Tests use proper mocks
- [ ] Code coverage >85%
- [ ] All tests pass
- [ ] Edge cases covered

**Estimated Effort:** 4 hours

---

### Task 10: Write Integration Tests
**Deliverable:** Integration tests for tenant IP restriction deployment and enforcement
**Validation:** All integration tests pass

**Steps:**
1. Create test file: `packages/cdk/test/tenant-ip-restriction.test.ts`
2. Test deployment scenarios:
   - Deploy tenant with IPv4 restrictions only
   - Deploy tenant with IPv6 restrictions only
   - Deploy tenant with mixed IPv4 and IPv6
   - Deploy tenant without IP restrictions
   - Update tenant with new IP restrictions
   - Attempt deploy with invalid IP ranges (expect failure)
   - Attempt deploy with empty IP ranges + enabled=true (expect failure)
3. Verify DynamoDB content after each deployment
4. Test runtime enforcement (if possible in integration tests):
   - Mock API requests with different source IPs
   - Verify Allow/Deny policies generated correctly
5. Verify backward compatibility with existing tenants

**Acceptance Criteria:**
- [ ] All deployment test scenarios implemented
- [ ] Tests verify DynamoDB table contents
- [ ] Tests verify validation errors for invalid input
- [ ] Tests verify runtime enforcement behavior (if feasible)
- [ ] Tests pass in CI/CD pipeline
- [ ] Test coverage includes edge cases

**Estimated Effort:** 5 hours

---

### Task 11: Update Documentation
**Deliverable:** Documentation for tenant IP restriction configuration and enforcement
**Validation:** Documentation reviewed and accurate

**Steps:**
1. Add section to deployment documentation (`docs/en/DEPLOY_OPTION.md`, `docs/ja/DEPLOY_OPTION.md`):
   - Explain tenant-specific IP restriction feature
   - Show example `cdk.tenant.json` configuration with IPv4 and IPv6
   - Document IP range format (CIDR notation)
   - Explain validation rules (enabled=true requires IP ranges)
   - Explain layered security (global WAF + tenant Lambda Authorizer)
   - Explain authorization cache (5-minute TTL)
2. Update `cdk.tenant.example.json` with inline comments
3. Add inline code comments in modified TypeScript files
4. Document X-Forwarded-For header handling
5. Document future Phase 2 plans (interactive UI)

**Acceptance Criteria:**
- [x] Documentation includes configuration examples
- [ ] Both English and Japanese documentation updated (English only for now)
- [x] CIDR notation format explained clearly
- [x] Validation rules documented
- [x] Layered security approach explained
- [x] Backward compatibility noted
- [x] Authorization caching explained
- [ ] Phase 2 roadmap mentioned (not needed for initial implementation)

**Estimated Effort:** 3 hours

---

## Total Estimated Effort
- **Phase 1 Tasks:** 31 hours (~4 days for single developer)
- **Configuration Tasks (1-5):** 10.75 hours
- **Lambda Authorizer Tasks (6-8):** 11 hours
- **Testing Tasks (9-10):** 9 hours
- **Documentation (11):** 3 hours

## Parallelization Opportunities
- **Task 1, 2, 3** can start in parallel (different code areas)
- **Task 6 and 7** (Lambda Authorizer) can start after Task 1 completes (needs types)
- **Task 9** (unit tests) can start as soon as Task 6-7 are drafted
- **Task 10** (integration tests) can start in parallel with Task 8
- **Task 11** (documentation) can start as soon as Task 5 and Task 8 are complete

## Parallel Execution Plan (2 developers)
**Developer A:**
- Tasks 1, 2, 3, 5 (config path)
- Then Task 11 (documentation)

**Developer B:**
- Task 1 (coordinate with Dev A)
- Tasks 6, 7, 8 (Lambda Authorizer path)
- Tasks 9, 10 (testing)

**Timeline:** ~2 weeks with 2 developers working in parallel

## Risk Mitigation
- **Risk:** Lambda Authorizer cache causes stale IP restrictions
  - **Mitigation:** Document 5-minute cache TTL, provide cache flush instructions

- **Risk:** X-Forwarded-For header spoofing
  - **Mitigation:** Ensure CloudFront is the only entry point, document WAF setup

- **Risk:** DynamoDB schema change breaks existing code
  - **Mitigation:** Field is optional, all code handles missing field gracefully (Task 4)

- **Risk:** Invalid IP ranges deployed to production
  - **Mitigation:** Validation at synthesis time prevents deployment (Task 3, Task 5)

- **Risk:** JWT verification library compatibility
  - **Mitigation:** Use official AWS `aws-jwt-verify` library, well-tested

- **Risk:** Breaking change for existing tenants
  - **Mitigation:** Cognito → Lambda Authorizer migration handled transparently, backward compatible

## Definition of Done
A task is considered complete when:
1. All acceptance criteria are met
2. Unit tests pass (if applicable)
3. Integration tests pass (if applicable)
4. Code review completed
5. Documentation updated (if user-facing)
6. No new linter warnings or errors
7. No regression in existing functionality

## Post-Implementation Validation
After all tasks complete:
1. Deploy a test tenant with IP restrictions (IPv4 and IPv6)
2. Verify DynamoDB table contains correct data
3. Test API access from allowed IP (should succeed)
4. Test API access from non-allowed IP (should return 403)
5. Deploy a tenant without IP restrictions (backward compatibility)
6. Update existing tenant with new IP restrictions
7. Verify documentation accuracy by following steps as new user
8. Verify authorization caching (check Lambda invocation count)
9. Verify layered security (global WAF + Lambda Authorizer)

## Future Work (Phase 2 - Out of Scope)
The following are explicitly out of scope for this change:
- Interactive UI for tenant administrators to configure IP restrictions
- Management API for updating IP restrictions post-deployment (without redeployment)
- IP restriction reporting and analytics dashboard
- Automated migration tools for global IP restrictions to tenant-specific
- Dynamic IP allowlist updates via CloudWatch Events

These will be addressed in subsequent changes after Phase 1 is deployed and validated.
