import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyAdminAccess, CORS_HEADERS, JWTClaims } from './utils/adminAuth';
import { verifyToken } from './utils/auth';

export interface AdminStatusResponse {
  isAdmin: boolean;
  tenantId: string;
  username: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // For checkAdminStatus, we still need to handle non-admin users
    // So we verify the token directly instead of using verifyAdminAccess
    const token = event.headers.Authorization || event.headers.authorization;
    if (!token) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Missing authorization token' }),
      };
    }

    const claims = await verifyToken(token) as JWTClaims | null;
    if (!claims) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const tenantId = claims['custom:tenant_id'];
    const isAdmin = claims['custom:tenantAdmin'] === 'true';
    const username = claims['cognito:username'] || claims.username || '';

    if (!tenantId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Tenant ID not found in token' }),
      };
    }

    const response: AdminStatusResponse = {
      isAdmin,
      tenantId,
      username,
    };

    console.log(`Admin status check for user ${username}: isAdmin=${isAdmin}, tenantId=${tenantId}`);

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