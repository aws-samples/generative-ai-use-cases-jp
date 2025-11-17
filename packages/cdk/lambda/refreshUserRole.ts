import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyTokenWithRoleCheck } from './utils/auth';
import {
  badRequest400Response,
  internalServerError500Response,
  ok200Response,
  unauthorized401Response,
} from './utils/apiResponse';

export interface RefreshUserRoleResponse {
  isAdmin: boolean;
  tenantId: string;
  username: string;
  roleChanged: boolean;
  message: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Extract token
    const token = event.headers.Authorization || event.headers.authorization;
    if (!token) {
      return unauthorized401Response({
        message: 'Missing authorization token',
      });
    }

    // Verify token with real-time role checking
    const verificationResult = await verifyTokenWithRoleCheck(token);
    if (!verificationResult) {
      return unauthorized401Response({ message: 'Invalid token' });
    }

    const { claims, isCurrentlyAdmin, tokenClaimAdmin } = verificationResult;
    const tenantId = claims['custom:tenant_id'];
    const username = claims['cognito:username'] || claims.username || '';

    // Check tenant ID
    if (!tenantId) {
      return badRequest400Response({ message: 'Tenant ID not found in token' });
    }

    const roleChanged = tokenClaimAdmin !== isCurrentlyAdmin;
    let message = 'Role status verified';

    if (roleChanged) {
      message = isCurrentlyAdmin
        ? 'Your role has been upgraded to admin. You now have administrative privileges.'
        : 'Your admin privileges have been revoked. You are now a regular user.';
    }

    const response: RefreshUserRoleResponse = {
      isAdmin: isCurrentlyAdmin,
      tenantId,
      username,
      roleChanged,
      message,
    };

    console.log(
      `Role refresh for user ${username}: current=${isCurrentlyAdmin}, token=${tokenClaimAdmin}, changed=${roleChanged}`
    );

    return ok200Response(response);
  } catch (error) {
    console.error('Error refreshing user role:', error);
    return internalServerError500Response({
      message: 'Failed to refresh role status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
