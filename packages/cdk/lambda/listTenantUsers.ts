import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  verifyAdminAccess,
  isAdminContext,
  getAttributeValue,
} from './utils/adminAuth';
import {
  internalServerError500Response,
  ok200Response,
} from './utils/apiResponse';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export interface TenantUser {
  username: string;
  email: string;
  tenantId: string;
  tenantAdmin: boolean;
  enabled: boolean;
  userStatus: string;
  createdDate: string;
  lastModifiedDate: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(event);
    if (!isAdminContext(adminResult)) {
      return adminResult;
    }

    const { tenantId } = adminResult;

    // TODO: This approach fetches all users and filters in-memory, which is inefficient for large user pools.
    // Consider implementing DynamoDB-based tenant user mapping or Cognito Groups for better scalability.

    // List all users and filter by tenant in memory
    const users: TenantUser[] = [];
    let paginationToken: string | undefined;

    do {
      const command = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60, // Maximum allowed by Cognito
        PaginationToken: paginationToken,
      });

      const response = await cognitoClient.send(command);

      if (response.Users) {
        for (const user of response.Users) {
          const userTenantId = getAttributeValue(
            user.Attributes,
            'custom:tenant_id'
          );

          // Only include users from the admin's tenant
          if (userTenantId === tenantId) {
            users.push({
              username: user.Username || '',
              email: getAttributeValue(user.Attributes, 'email'),
              tenantId: userTenantId,
              tenantAdmin:
                getAttributeValue(user.Attributes, 'custom:tenantAdmin') ===
                'true',
              enabled: user.Enabled || false,
              userStatus: user.UserStatus || '',
              createdDate: user.UserCreateDate?.toISOString() || '',
              lastModifiedDate: user.UserLastModifiedDate?.toISOString() || '',
            });
          }
        }
      }

      paginationToken = response.PaginationToken;
    } while (paginationToken);

    console.log(`Found ${users.length} users for tenant ${tenantId}`);

    return ok200Response({
      users,
      totalCount: users.length,
    });
  } catch (error) {
    console.error('Error listing tenant users:', error);
    return internalServerError500Response({
      message: 'Failed to list tenant users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
