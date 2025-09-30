import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyAdminAccess, CORS_HEADERS, JWTClaims } from './utils/adminAuth';
import { verifyToken, verifyTokenWithRoleCheck } from './utils/auth';

export interface AdminStatusResponse {
  isAdmin: boolean;
  tenantId: string;
  username: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Extract token
    const token = event.headers.Authorization || event.headers.authorization;
    if (!token) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing authorization token' }),
      };
    }

    // Use real-time role checking to ensure consistency with other endpoints
    const verificationResult = await verifyTokenWithRoleCheck(token);
    if (!verificationResult) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const { claims, isCurrentlyAdmin } = verificationResult;
    const tenantId = claims['custom:tenant_id'];
    const username = claims['cognito:username'] || claims.username || '';

    if (!tenantId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Tenant ID not found in token' }),
      };
    }

    const response: AdminStatusResponse = {
      isAdmin: isCurrentlyAdmin, // Use real-time admin status from Cognito
      tenantId,
      username,
    };

    console.log(
      `Admin status check for user ${username}: isAdmin=${isCurrentlyAdmin}, tenantId=${tenantId}`
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Failed to check admin status',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
