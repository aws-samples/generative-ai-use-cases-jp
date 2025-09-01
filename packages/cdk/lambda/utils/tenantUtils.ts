import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Extract tenant ID from the JWT claims in the API Gateway event
 */
export const getTenantId = (event: APIGatewayProxyEvent): string => {
  // Try to get tenant ID from authorizer claims (API Gateway Lambda authorizer)
  const tenantId =
    event.requestContext?.authorizer?.claims?.['custom:tenant_id'] ||
    event.requestContext?.authorizer?.['custom:tenant_id'] ||
    // Fallback to a default tenant for backwards compatibility
    process.env.DEFAULT_TENANT_ID ||
    'default';

  if (!tenantId || tenantId === 'default') {
    console.warn('No tenant ID found in request, using default tenant');
  }

  return tenantId;
};
