import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
  Credentials,
} from '@aws-sdk/client-cognito-identity';
import * as crypto from 'crypto';

// Maximum retries for Cognito Identity operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

/**
 * Get credentials using Cognito Identity Pool Enhanced Flow with retry logic
 * The Identity Pool automatically maps JWT claims to principal tags for ABAC
 * NOTE: No caching to ensure proper user isolation within tenants
 */
export async function getTenantCredentials(
  event: APIGatewayProxyEvent
): Promise<Credentials> {
  // Validate required environment variables
  if (!process.env.IDENTITY_POOL_ID) {
    throw new Error('IDENTITY_POOL_ID environment variable is not set');
  }
  if (!process.env.USER_POOL_ID) {
    throw new Error('USER_POOL_ID environment variable is not set');
  }
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  // Extract tenant ID for logging
  const tenantId =
    event.requestContext?.authorizer?.claims?.['custom:tenant_id'] || 'default';

  // Extract user ID for logging
  const userId =
    event.requestContext?.authorizer?.claims?.['cognito:username'] || 'unknown';

  // Extract JWT token from Authorization header
  const idToken = event.headers.Authorization || event.headers.authorization;
  if (!idToken) {
    throw new Error('No valid authorization token found');
  }

  console.log(
    `Getting credentials for tenant: ${tenantId}, user: ${userId}, identity pool: ${process.env.IDENTITY_POOL_ID}`
  );

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const cognitoClient = new CognitoIdentityClient({});

      // Step 1: Get Identity ID from the JWT token
      const getIdResponse = await cognitoClient.send(
        new GetIdCommand({
          IdentityPoolId: process.env.IDENTITY_POOL_ID!,
          Logins: {
            [`cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`]:
              idToken,
          },
        })
      );

      if (!getIdResponse.IdentityId) {
        throw new Error(
          `Failed to obtain Identity ID from Cognito Identity Pool. Response: ${JSON.stringify(getIdResponse)}`
        );
      }

      console.log(
        `Successfully obtained Identity ID: ${getIdResponse.IdentityId}`
      );

      // Step 2: Get credentials for the identity
      // The Identity Pool automatically applies principal tags from JWT claims
      const getCredentialsResponse = await cognitoClient.send(
        new GetCredentialsForIdentityCommand({
          IdentityId: getIdResponse.IdentityId,
          Logins: {
            [`cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`]:
              idToken,
          },
        })
      );

      if (!getCredentialsResponse.Credentials) {
        throw new Error(
          `Failed to obtain credentials from Cognito Identity Pool. Response: ${JSON.stringify(getCredentialsResponse)}`
        );
      }

      console.log(
        `Successfully obtained credentials for tenant: ${tenantId}, user: ${userId}`
      );

      // Return fresh credentials without caching
      return getCredentialsResponse.Credentials;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `GetCredentialsForIdentity attempt ${attempt} failed for tenant: ${tenantId}, user: ${userId}:`,
        {
          error: error,
          errorMessage: (error as Error).message,
          identityPoolId: process.env.IDENTITY_POOL_ID,
          userPoolId: process.env.USER_POOL_ID,
          region: process.env.AWS_REGION,
        }
      );

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        console.log(`Retrying in ${RETRY_DELAY * attempt}ms...`);
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * attempt)
        );
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to get credentials after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}
