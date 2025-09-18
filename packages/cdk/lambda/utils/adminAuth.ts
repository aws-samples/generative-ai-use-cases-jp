import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AttributeType
} from '@aws-sdk/client-cognito-identity-provider';
import { verifyToken } from './auth';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION! });
const USER_POOL_ID = process.env.USER_POOL_ID!;

export interface JWTClaims {
  'custom:tenant_id': string;
  'custom:tenantAdmin': string;
  'cognito:username': string;
  username?: string;
  [key: string]: string | undefined;
}

export interface AdminContext {
  tenantId: string;
  username: string;
  isAdmin: boolean;
  claims: JWTClaims;
}

export interface TenantUser {
  username: string;
  tenantId: string;
  attributes?: AttributeType[];
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Verify JWT token and admin status, return admin context or error response
 */
export async function verifyAdminAccess(event: APIGatewayProxyEvent): Promise<AdminContext | APIGatewayProxyResult> {
  // Extract token
  const token = event.headers.Authorization || event.headers.authorization;
  if (!token) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Missing authorization token' }),
    };
  }

  // Verify token
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

  // Check tenant ID
  if (!tenantId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Tenant ID not found in token' }),
    };
  }

  // Check admin status
  if (!isAdmin) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Access denied. Admin privileges required.' }),
    };
  }

  return {
    tenantId,
    username,
    isAdmin,
    claims,
  };
}

/**
 * Verify that a user belongs to the same tenant as the admin
 */
export async function verifyTenantMembership(
  username: string,
  adminTenantId: string
): Promise<TenantUser | APIGatewayProxyResult> {
  try {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    const userResponse = await cognitoClient.send(getUserCommand);

    if (!userResponse.UserAttributes) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // Check if user belongs to the same tenant
    const userTenantId = userResponse.UserAttributes.find(
      attr => attr.Name === 'custom:tenant_id'
    )?.Value;

    if (userTenantId !== adminTenantId) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Cannot access user from different tenant'
        }),
      };
    }

    return {
      username,
      tenantId: userTenantId,
      attributes: userResponse.UserAttributes,
    };

  } catch (error: unknown) {
    console.error(`Failed to verify tenant membership for user ${username}:`, error);

    if (error instanceof Error && error.name === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Failed to verify user access',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Verify admin access and optionally check tenant membership for a specific user
 */
export async function verifyAdminAccessWithUser(
  event: APIGatewayProxyEvent,
  targetUsername?: string
): Promise<{ admin: AdminContext; user?: TenantUser; } | APIGatewayProxyResult> {
  // First verify admin access
  const adminResult = await verifyAdminAccess(event);
  if ('statusCode' in adminResult) {
    return adminResult; // Return error response
  }

  // If target username provided, verify tenant membership
  if (targetUsername) {
    const userResult = await verifyTenantMembership(targetUsername, adminResult.tenantId);
    if ('statusCode' in userResult) {
      return userResult; // Return error response
    }

    return {
      admin: adminResult,
      user: userResult,
    };
  }

  return {
    admin: adminResult,
  };
}

/**
 * Helper to get attribute value from Cognito user attributes
 */
export function getAttributeValue(attributes: AttributeType[] | undefined, name: string): string {
  return attributes?.find(attr => attr.Name === name)?.Value || '';
}

/**
 * Type guard to check if result is AdminContext
 */
export function isAdminContext(result: AdminContext | APIGatewayProxyResult): result is AdminContext {
  return 'tenantId' in result;
}

/**
 * Type guard to check if result is TenantUser
 */
export function isTenantUser(result: TenantUser | APIGatewayProxyResult): result is TenantUser {
  return 'username' in result && 'tenantId' in result;
}

/**
 * Type guard to check if result contains admin and user data
 */
export function isAdminUserResult(result: { admin: AdminContext; user?: TenantUser; } | APIGatewayProxyResult): result is { admin: AdminContext; user?: TenantUser; } {
  return 'admin' in result;
}
