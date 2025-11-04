import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
const ipRangeCheck = require('ip-range-check');

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID!;
const TENANTS_TABLE_NAME = process.env.TENANTS_TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION!;

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });

// Create JWT verifier for Cognito ID tokens (which contain custom claims)
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'id',
  clientId: null, // Allow any client ID
});

interface Tenant {
  tenantId: string;
  ipAccessControl?: {
    enabled: boolean;
    allowedIpV4AddressRanges: string[];
    allowedIpV6AddressRanges: string[];
    updatedAt: string;
    updatedBy: string;
  };
}

/**
 * Cognito JWT payload structure
 */
interface CognitoJwtPayload {
  sub: string;
  'cognito:username': string;
  'custom:tenant_id'?: string;
  'custom:tenantAdmin'?: string;
  email?: string;
  email_verified?: boolean;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  token_use: string;
  auth_time?: number;
}

/**
 * Authorizer claims structure for API Gateway context
 * API Gateway requires all context values to be strings
 */
interface AuthorizerClaims {
  sub: string;
  'cognito:username': string;
  'custom:tenant_id': string;
  'custom:tenantAdmin'?: string;
  email?: string;
  email_verified?: string;  // Must be string for API Gateway
}

/**
 * Lambda Request Authorizer handler
 * Verifies JWT tokens and enforces tenant-specific IP restrictions
 */
export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorization request:', JSON.stringify(event, null, 2));
  console.log('methodArn:', event.methodArn);

  try {
    // Extract JWT from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      console.error('Missing Authorization header');
      return generateDenyPolicy('user', event.methodArn, 'Missing Authorization header');
    }

    // Extract Bearer token
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      console.error('Invalid Authorization header format');
      return generateDenyPolicy('user', event.methodArn, 'Invalid Authorization header');
    }

    // Verify JWT and extract claims
    let payload: CognitoJwtPayload;
    try {
      payload = await jwtVerifier.verify(token);
      console.log('JWT verified successfully');
    } catch (error) {
      console.error('JWT verification failed:', error);
      return generateDenyPolicy('user', event.methodArn, 'Invalid or expired token');
    }

    // Extract tenant ID from custom claim
    const tenantId = payload['custom:tenant_id'] as string;
    const username = payload['cognito:username'] as string;

    if (!tenantId) {
      console.error('Missing tenant ID in JWT claims');
      return generateDenyPolicy(username, event.methodArn, 'Missing tenant ID');
    }

    console.log(`Request from user: ${username}, tenant: ${tenantId}`);

    // Fetch tenant configuration from DynamoDB
    let tenant: Tenant | null;
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TENANTS_TABLE_NAME,
          Key: {
            tenantId: { S: tenantId },
          },
        })
      );

      if (!response.Item) {
        console.error(`Tenant not found: ${tenantId}`);
        return generateDenyPolicy(username, event.methodArn, 'Tenant not found');
      }

      tenant = unmarshall(response.Item) as Tenant;
      console.log('Tenant configuration retrieved');
    } catch (error) {
      console.error('Failed to fetch tenant configuration:', error);
      return generateDenyPolicy(username, event.methodArn, 'Internal error');
    }

    // Check if IP access control is enabled
    if (!tenant.ipAccessControl || !tenant.ipAccessControl.enabled) {
      console.log('IP access control not enabled for tenant');
      return generateAllowPolicy(username, event.methodArn, payload);
    }

    // Extract client IP from X-Forwarded-For header (first IP in the list)
    const xForwardedFor = event.headers?.['X-Forwarded-For'] || event.headers?.['x-forwarded-for'];
    if (!xForwardedFor) {
      console.error('Missing X-Forwarded-For header');
      return generateDenyPolicy(username, event.methodArn, 'Cannot determine client IP');
    }

    const clientIp = xForwardedFor.split(',')[0].trim();
    console.log(`Client IP: ${clientIp}`);

    // Check IP against allowed ranges
    const allowedRanges = [
      ...(tenant.ipAccessControl.allowedIpV4AddressRanges || []),
      ...(tenant.ipAccessControl.allowedIpV6AddressRanges || []),
    ];

    if (allowedRanges.length === 0) {
      console.warn('IP access control enabled but no IP ranges configured');
      return generateDenyPolicy(username, event.methodArn, 'No IP ranges configured');
    }

    const isAllowed = ipRangeCheck(clientIp, allowedRanges);

    if (isAllowed) {
      console.log(`IP ${clientIp} is allowed for tenant ${tenantId}`);
      return generateAllowPolicy(username, event.methodArn, payload, clientIp);
    } else {
      console.warn(`IP ${clientIp} denied for tenant ${tenantId}`);
      // Log denied request for audit
      console.log(
        JSON.stringify({
          event: 'IP_ACCESS_DENIED',
          tenantId,
          username,
          clientIp,
          timestamp: new Date().toISOString(),
          allowedRanges,
        })
      );
      return generateDenyPolicy(username, event.methodArn, 'IP not allowed');
    }
  } catch (error) {
    console.error('Unexpected error in authorizer:', error);
    return generateDenyPolicy('user', event.methodArn, 'Internal error');
  }
};

/**
 * Generate an Allow IAM policy for API Gateway with comprehensive claims
 */
function generateAllowPolicy(
  principalId: string,
  resource: string,
  jwtPayload: CognitoJwtPayload,
  clientIp?: string
): APIGatewayAuthorizerResult {
  // Allow access to all endpoints in the API by using wildcard
  const wildcardResource = resource.split('/').slice(0, 2).join('/') + '/*/*';

  // Extract claims from JWT payload
  const tenantId = jwtPayload['custom:tenant_id'] || 'default';
  const username = jwtPayload['cognito:username'];
  const sub = jwtPayload.sub;
  const email = jwtPayload.email;
  const tenantAdmin = jwtPayload['custom:tenantAdmin'];

  // Create claims object matching Cognito User Pools Authorizer format
  const claims: AuthorizerClaims = {
    sub,
    'cognito:username': username,
    'custom:tenant_id': tenantId,
  };

  // Add optional claims if present
  if (tenantAdmin) {
    claims['custom:tenantAdmin'] = tenantAdmin;
  }
  if (email) {
    claims.email = email;
  }
  if (jwtPayload.email_verified !== undefined) {
    claims.email_verified = String(jwtPayload.email_verified);
  }

  const policy: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: wildcardResource,
        },
      ],
    },
    context: {
      // Flat structure (for code using event.requestContext.authorizer['custom:tenant_id'])
      sub,
      'cognito:username': username,
      'custom:tenant_id': tenantId,
      'custom:tenantAdmin': tenantAdmin || '',
      email: email || '',

      // Nested claims structure (for code using event.requestContext.authorizer.claims['custom:tenant_id'])
      // MUST be stringified per API Gateway requirements
      claims: JSON.stringify(claims),

      // Additional context
      clientIp: clientIp || '',
    },
  };

  console.log('Returning Allow policy:', JSON.stringify(policy, null, 2));
  return policy;
}

/**
 * Generate a Deny IAM policy for API Gateway
 */
function generateDenyPolicy(
  principalId: string,
  resource: string,
  reason?: string
): APIGatewayAuthorizerResult {
  console.error(`Access denied: ${reason}`);
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: resource,
        },
      ],
    },
    context: {
      reason: reason || 'Access denied',
    },
  };
}
