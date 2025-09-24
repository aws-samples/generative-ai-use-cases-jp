import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * JWT token verification using AWS JWT Verify library
 * This properly verifies JWT signatures against Cognito
 */

// Environment variables for Cognito configuration
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

// Create JWT verifier instance
let jwtVerifier: any = null;
let cognitoClient: CognitoIdentityProviderClient | null = null;

function getJwtVerifier(): any {
  if (!jwtVerifier) {
    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      throw new Error(
        'USER_POOL_ID and USER_POOL_CLIENT_ID environment variables are required'
      );
    }

    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      clientId: USER_POOL_CLIENT_ID,
      tokenUse: 'id', // Verify ID tokens
    });
  }
  return jwtVerifier;
}

function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION! });
  }
  return cognitoClient;
}

/**
 * Verify and decode JWT ID token using AWS JWT Verify
 * This properly validates the token signature against Cognito
 */
export async function verifyToken(token: string): Promise<any | null> {
  if (!token) {
    return null;
  }

  try {
    const verifier = getJwtVerifier();

    // Verify the token - this will throw if verification fails
    const payload = await verifier.verify(token);

    console.log(
      'Token verified successfully for user:',
      payload['cognito:username']
    );
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Get current user attributes from Cognito
 * Used for real-time role verification when token claims might be outdated
 */
export async function getCurrentUserAttributes(username: string): Promise<{ [key: string]: string } | null> {
  if (!USER_POOL_ID || !username) {
    return null;
  }

  try {
    const client = getCognitoClient();
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    });

    const response = await client.send(command);
    if (!response.UserAttributes) {
      return null;
    }

    // Convert attributes array to object
    const attributes: { [key: string]: string } = {};
    for (const attr of response.UserAttributes) {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    }

    return attributes;
  } catch (error) {
    console.error('Failed to get current user attributes:', error);
    return null;
  }
}

/**
 * Enhanced token verification with real-time role checking
 * Falls back to Cognito attributes when token claims might be outdated
 */
export async function verifyTokenWithRoleCheck(token: string, requireAdmin?: boolean): Promise<{
  claims: any;
  currentAttributes: { [key: string]: string } | null;
  isCurrentlyAdmin: boolean;
  tokenClaimAdmin: boolean;
} | null> {
  const claims = await verifyToken(token);
  if (!claims) {
    return null;
  }

  const username = claims['cognito:username'] || claims.username;
  const tokenClaimAdmin = claims['custom:tenantAdmin'] === 'true';

  // Get current attributes for real-time role verification
  const currentAttributes = await getCurrentUserAttributes(username);
  const isCurrentlyAdmin = currentAttributes?.['custom:tenantAdmin'] === 'true';

  return {
    claims,
    currentAttributes,
    isCurrentlyAdmin,
    tokenClaimAdmin,
  };
}
