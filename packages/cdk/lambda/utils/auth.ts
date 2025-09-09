import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * JWT token verification using AWS JWT Verify library
 * This properly verifies JWT signatures against Cognito
 */

// Environment variables for Cognito configuration
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

// Create JWT verifier instance
let jwtVerifier: any = null;

function getJwtVerifier(): any {
  if (!jwtVerifier) {
    if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
      throw new Error('USER_POOL_ID and USER_POOL_CLIENT_ID environment variables are required');
    }
    
    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      clientId: USER_POOL_CLIENT_ID,
      tokenUse: 'id', // Verify ID tokens
    });
  }
  return jwtVerifier;
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
    
    console.log('Token verified successfully for user:', payload['cognito:username']);
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
