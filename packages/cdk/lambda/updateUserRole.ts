import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  verifyAdminAccessWithUser,
  isAdminUserResult,
  CORS_HEADERS,
} from './utils/adminAuth';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export interface UpdateUserRoleRequest {
  username: string;
  tenantAdmin: boolean;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body first to get username
    let requestBody: UpdateUserRoleRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid JSON in request body' }),
      };
    }

    const { username, tenantAdmin } = requestBody;

    if (!username || typeof tenantAdmin !== 'boolean') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'username (string) and tenantAdmin (boolean) are required',
        }),
      };
    }

    // Verify admin access and user membership in same tenant
    const result = await verifyAdminAccessWithUser(event, username);
    if (!isAdminUserResult(result)) {
      return result;
    }

    const { admin } = result;

    // Prevent admin from removing their own admin status
    if (username === admin.username && !tenantAdmin) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Cannot remove admin privileges from yourself',
        }),
      };
    }

    // Update user role
    try {
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: [
          {
            Name: 'custom:tenantAdmin',
            Value: tenantAdmin.toString(),
          },
        ],
      });

      await cognitoClient.send(updateCommand);

      console.log(
        `Successfully updated user ${username} tenantAdmin status to ${tenantAdmin}`
      );

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'User role updated successfully',
          username,
          tenantAdmin,
        }),
      };
    } catch (error: unknown) {
      console.error(`Failed to update user ${username}:`, error);

      if (error instanceof Error && error.name === 'UserNotFoundException') {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'User not found' }),
        };
      }

      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Failed to update user role',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
