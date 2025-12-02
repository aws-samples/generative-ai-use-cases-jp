import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { verifyToken } from './utils/auth';
import {
  internalServerError500Response,
  notFound404Response,
  ok200Response,
  unauthorized401Response,
} from './utils/apiResponse';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Get token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return unauthorized401Response({ message: 'Authorization header is required' });
    }

    // Remove 'Bearer ' prefix if present
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Verify token and get user info
    const claims = await verifyToken(token);
    if (!claims) {
      return unauthorized401Response({ message: 'Invalid or expired token' });
    }

    const username = claims['cognito:username'] || claims.username;
    if (!username) {
      return unauthorized401Response({ message: 'Username not found in token' });
    }

    // Delete the user from Cognito
    try {
      const deleteCommand = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      });

      await cognitoClient.send(deleteCommand);
      console.log(`Successfully deleted user: ${username}`);

      return ok200Response({
        message: 'Account deleted successfully',
      });
    } catch (error: unknown) {
      console.error(`Failed to delete user ${username}:`, error);

      if (error instanceof Error && error.name === 'UserNotFoundException') {
        return notFound404Response({ message: 'User not found' });
      }

      throw error;
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    return internalServerError500Response({
      message: 'Failed to delete account',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
