# Tenant Admin Management Specification

## Overview

This specification describes the implementation of tenant admin functionality that allows designated tenant administrators to manage users within their tenant. The implementation provides a clear separation between general users and tenant administrators through Cognito user pool attributes, without modifying existing IAM role structures.

## Requirements

### Minimum Requirements

1. **Logical separation of general users and tenant administrators**
   - Backend verification through Cognito user pool attributes
   - Frontend UI conditional rendering based on admin status

2. **User management by tenant administrators**
   - List all users within the tenant
   - Invite new users (individual and CSV bulk)
   - Update user roles (general user ↔ tenant administrator)
   - Remove users from the tenant

3. **Admin portal access from settings page**
   - Button visible only to tenant administrators
   - URL-based access prevention for non-admin users

### User Roles

- **General User**: Standard user with access to all use cases
- **Tenant Administrator**: Has all general user permissions + user management capabilities

### User Invitation Flow

1. Admin enters user email(s) on admin page
2. System creates user in Cognito User Pool with temporary password
   - **IMPORTANT**: Invited user automatically gets the same `custom:tenant_id` as the admin who invited them
   - User is assigned `custom:tenantAdmin: false` by default
3. Verification email sent to invited user with temporary password
4. User logs in with email and temporary password
5. System forces password change on first login
6. User gains access to the application with proper tenant isolation

## Architecture

### Authentication & Authorization

#### Current Implementation
- Users have `custom:tenant_id` attribute for tenant isolation
- Pre-token generation Lambda adds tenant claims to JWT
- Identity Pool maps claims to principal tags for cross-account resource access

#### New Implementation
- Add `custom:tenantAdmin` attribute (values: "true" | "false")
- Update pre-token generation Lambda to include tenantAdmin claim in JWT
- Backend APIs verify tenantAdmin claim for admin operations
- Frontend checks tenantAdmin claim to show/hide admin features

### Backend Components

#### Lambda Functions

1. **listTenantUsers.ts**
   - Lists all users belonging to the authenticated user's tenant
   - Requires tenantAdmin=true claim

2. **inviteTenantUsers.ts**
   - Creates new users via Cognito AdminCreateUser API
   - Supports individual and bulk invitation
   - Sets temporary password and forces password change
   - Requires tenantAdmin=true claim

3. **updateUserRole.ts**
   - Updates `custom:tenantAdmin` attribute for specified user
   - Requires tenantAdmin=true claim
   - Cannot remove admin status from self

4. **removeTenantUser.ts**
   - Removes user from tenant (disables or deletes from Cognito)
   - Requires tenantAdmin=true claim
   - Cannot remove self

5. **checkAdminStatus.ts**
   - Returns admin status for authenticated user
   - Used by frontend to determine UI behavior

#### API Endpoints

```
GET /admin/users - List tenant users
POST /admin/users/invite - Invite new users
PUT /admin/users/{userId}/role - Update user role
DELETE /admin/users/{userId} - Remove user
GET /admin/status - Check admin status
```

### Frontend Components

#### Pages
- **AdminPortal.tsx**: Main admin dashboard with user management interface

#### Components
- **UserManagementTable.tsx**: Table displaying tenant users with action buttons
- **UserInviteDialog.tsx**: Form for individual user invitation
- **CSVUploader.tsx**: Component for bulk user invitation via CSV upload
- **RoleSelector.tsx**: Dropdown for changing user roles

#### Settings Page Update
- Add "Admin Portal" button that appears only for users with tenantAdmin=true
- Button navigation to /admin route

## Implementation Details

### Cognito Integration

#### User Pool Configuration
- No changes to existing user pool structure
- Utilize existing custom attributes mechanism

#### AdminCreateUser Parameters
```typescript
{
  UserPoolId: USER_POOL_ID,
  Username: email,
  UserAttributes: [
    { Name: 'email', Value: email },
    { Name: 'email_verified', Value: 'true' },
    { Name: 'custom:tenant_id', Value: tenantId },
    { Name: 'custom:tenantAdmin', Value: 'false' }
  ],
  TemporaryPassword: generateTemporaryPassword(),
  MessageAction: 'SUPPRESS' // We'll handle email sending
}
```

#### Email Template
```
Subject: Invitation to join [Tenant Name]

You have been invited to join our AI platform.

Login URL: [APPLICATION_URL]
Email: [USER_EMAIL]
Temporary Password: [TEMP_PASSWORD]

Please log in and change your password on first access.
```

### Access Control

#### Backend Validation
```typescript
// In each admin Lambda function
const claims = await verifyToken(authToken);
const isAdmin = claims['custom:tenantAdmin'] === 'true';
if (!isAdmin) {
  return { statusCode: 403, body: 'Access denied' };
}
```

#### Frontend Route Guards
```typescript
// AdminPortal.tsx
const { user } = useAuthenticator();
const isAdmin = user?.signInUserSession?.idToken?.payload?.['custom:tenantAdmin'] === 'true';

if (!isAdmin) {
  return <Navigate to="/settings" replace />;
}
```

### CSV Upload Format

```csv
email
user1@example.com
user2@example.com
user3@example.com
```

#### Validation Rules
- Valid email format
- Unique emails within CSV
- Maximum 100 users per upload
- Email domain validation (if configured)

## Security Considerations

1. **Admin Status Verification**: All admin operations verify tenantAdmin claim in JWT
2. **Self-Management Prevention**: Admin cannot remove their own admin status or delete themselves
3. **Tenant Isolation**: Users can only manage users within their own tenant
4. **URL Access Control**: Direct URL access to admin pages blocked for non-admins
5. **Token Validation**: All API calls validate JWT tokens with proper claims

## Testing Strategy

### Unit Tests
- Lambda function logic for user management operations
- JWT claim verification
- CSV parsing and validation
- Component rendering based on admin status

### Integration Tests
- End-to-end admin workflows
- Cognito user creation and attribute management
- Email invitation flow
- Role switching validation

### Security Tests
- Unauthorized access attempts
- Cross-tenant data access attempts
- Admin privilege escalation attempts

## Future Enhancements

1. **Granular Permissions**: More specific admin roles (user manager, content manager, etc.)
2. **Audit Logging**: Track all admin actions for compliance
3. **User Groups**: Organize users into groups with different permissions
4. **Advanced Invitation**: Custom email templates and invitation expiration
5. **User Analytics**: Dashboard with user activity metrics

## Migration Plan

### Phase 1: Backend Implementation
1. Create Lambda functions
2. Add API routes
3. Update pre-token generation Lambda

### Phase 2: Frontend Implementation
1. Create admin components
2. Update settings page
3. Add routing and guards

### Phase 3: Testing & Documentation
1. End-to-end testing
2. User documentation
3. Admin training materials

## Rollback Plan

If issues occur:
1. Remove admin API routes from API Gateway
2. Revert pre-token generation Lambda
3. Hide admin UI components via feature flag
4. All existing functionality remains intact