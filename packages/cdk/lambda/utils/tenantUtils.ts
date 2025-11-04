import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Parse claims from authorizer context
 * Handles both stringified claims (Lambda Request Authorizer) and direct objects (Cognito User Pools Authorizer)
 */
function parseClaims(event: APIGatewayProxyEvent): Record<string, string> | null {
  const claimsValue = event.requestContext?.authorizer?.claims;

  if (!claimsValue) {
    return null;
  }

  // If already an object, return it (Cognito User Pools Authorizer format)
  if (typeof claimsValue === 'object' && !Array.isArray(claimsValue)) {
    return claimsValue as Record<string, string>;
  }

  // If string, parse it (Lambda Request Authorizer format - stringified JSON)
  if (typeof claimsValue === 'string') {
    try {
      return JSON.parse(claimsValue) as Record<string, string>;
    } catch (error) {
      console.error('Failed to parse claims:', error);
      return null;
    }
  }

  return null;
}

/**
 * Extract tenant ID from the JWT claims in the API Gateway event
 */
export const getTenantId = (event: APIGatewayProxyEvent): string => {
  // Try to get tenant ID from authorizer context (Lambda Request Authorizer - flat structure)
  const tenantId =
    event.requestContext?.authorizer?.['custom:tenant_id'] ||
    // Try to get from parsed claims object (Lambda Request Authorizer - nested structure or Cognito User Pools)
    parseClaims(event)?.['custom:tenant_id'] ||
    // Fallback to a default tenant for backwards compatibility
    process.env.DEFAULT_TENANT_ID ||
    'default';

  if (!tenantId || tenantId === 'default') {
    console.warn('No tenant ID found in request, using default tenant');
  }

  return tenantId;
};

/**
 * Alias for getTenantId for consistency with new naming convention
 */
export const getUserTenantId = (event: APIGatewayProxyEvent): string => {
  return getTenantId(event);
};

/**
 * Extract username from the API Gateway event authorizer context
 */
export const getUsername = (event: APIGatewayProxyEvent): string => {
  // Try to get username from authorizer context (Lambda Request Authorizer - flat structure)
  const username =
    event.requestContext?.authorizer?.['cognito:username'] ||
    // Try to get from parsed claims object (Lambda Request Authorizer - nested structure or Cognito User Pools)
    parseClaims(event)?.['cognito:username'] ||
    'unknown';

  return username;
};
