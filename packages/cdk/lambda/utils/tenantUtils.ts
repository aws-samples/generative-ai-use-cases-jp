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
 *
 * In multi-tenant environments, this should always return a valid tenant ID.
 * Falls back to DEFAULT_TENANT_ID or 'default' for backwards compatibility
 * with single-tenant deployments, but logs a warning.
 */
export const getTenantId = (event: APIGatewayProxyEvent): string => {
  // Try to get tenant ID from authorizer context (Lambda Request Authorizer - flat structure)
  const tenantId =
    event.requestContext?.authorizer?.['custom:tenant_id'] ||
    // Try to get from parsed claims object (Lambda Request Authorizer - nested structure or Cognito User Pools)
    parseClaims(event)?.['custom:tenant_id'];

  if (!tenantId) {
    // Fallback to default tenant for backwards compatibility with single-tenant deployments
    const fallbackTenantId = process.env.DEFAULT_TENANT_ID || 'default';
    console.warn(
      `[SECURITY WARNING] No tenant ID found in request. Using fallback: ${fallbackTenantId}. ` +
      `In multi-tenant environments, this could indicate a security issue. ` +
      `Verify that custom:tenant_id claim is properly set in the JWT token.`
    );
    return fallbackTenantId;
  }

  if (tenantId === 'default') {
    console.warn(
      `[SECURITY WARNING] Tenant ID is explicitly set to 'default'. ` +
      `This may indicate a misconfiguration in multi-tenant environments.`
    );
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
