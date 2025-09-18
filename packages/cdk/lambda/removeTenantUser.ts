import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  AdminDeleteUserCommand,
  AdminDisableUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { verifyAdminAccessWithUser, isAdminUserResult, CORS_HEADERS } from './utils/adminAuth';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION! });
const USER_POOL_ID = process.env.USER_POOL_ID!;

export interface RemoveUserRequest {
  username: string;
  action?: 'disable' | 'delete'; // default: 'disable'
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body first to get username
    let requestBody: RemoveUserRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid JSON in request body' }),
      };
    }

    const { username, action = 'disable' } = requestBody;

    if (!username) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'username is required' }),
      };
    }

    if (action !== 'disable' && action !== 'delete') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'action must be either "disable" or "delete"' }),
      };
    }

    // Verify admin access and user membership in same tenant
    const result = await verifyAdminAccessWithUser(event, username);
    if (!isAdminUserResult(result)) {
      return result;
    }

    const { admin } = result;

    // Prevent admin from removing themselves
    if (username === admin.username) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'Cannot remove yourself' 
        }),
      };
    }

    // Perform the user removal action
    try {
      if (action === 'delete') {
        const deleteCommand = new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
        });

        await cognitoClient.send(deleteCommand);
        console.log(`Successfully deleted user: ${username}`);
      } else {
        const disableCommand = new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
        });

        await cognitoClient.send(disableCommand);
        console.log(`Successfully disabled user: ${username}`);
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: `User ${action === 'delete' ? 'deleted' : 'disabled'} successfully`,
          username,
          action,
        }),
      };

    } catch (error: unknown) {
      console.error(`Failed to ${action} user ${username}:`, error);

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
    console.error('Error removing user:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        message: 'Failed to remove user',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};