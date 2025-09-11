import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  STSClient,
  AssumeRoleWithWebIdentityCommand,
  Credentials,
} from '@aws-sdk/client-sts';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetOpenIdTokenCommand,
} from '@aws-sdk/client-cognito-identity';

// Constants for AssumeRole operations
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const SESSION_DURATION_SECONDS = 3600;

/**
 * Assume role using Identity Pool token exchange from Cognito User Pool JWT
 * Exchange User Pool JWT → Identity Pool token → AssumeRoleWithWebIdentity
 */
export async function assumeRoleWithWebIdentity(
  event: APIGatewayProxyEvent,
  roleArn: string
): Promise<Credentials> {

  // Extract tenant ID and user ID from claims
  const tenantId =
    event.requestContext?.authorizer?.claims?.['custom:tenant_id'];
  const userId =
    event.requestContext?.authorizer?.claims?.['cognito:username'];

  // Extract User Pool JWT token from Authorization header
  const userPoolToken = event.headers.Authorization;
  if (!userPoolToken) {
    throw new Error('No valid authorization token found');
  }

  // Get environment variables
  const identityPoolId = process.env.IDENTITY_POOL_ID;
  const userPoolId = process.env.USER_POOL_ID;
  const region = process.env.AWS_REGION!;

  if (!identityPoolId || !userPoolId) {
    throw new Error('IDENTITY_POOL_ID or USER_POOL_ID not configured');
  }

  console.log(
    `Starting Identity Pool token exchange for tenant: ${tenantId}, user: ${userId}, role: ${roleArn}`
  );

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const cognitoIdentityClient = new CognitoIdentityClient({ region });
      const stsClient = new STSClient({ region });

      // Step 1: Exchange User Pool token for Identity ID
      console.log(`Attempt ${attempt}: Getting Identity ID from Identity Pool`);
      const userPoolProviderName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

      const getIdResponse = await cognitoIdentityClient.send(
        new GetIdCommand({
          IdentityPoolId: identityPoolId,
          Logins: {
            [userPoolProviderName]: userPoolToken,
          },
        })
      );

      if (!getIdResponse.IdentityId) {
        throw new Error('Failed to get Identity ID from Identity Pool');
      }

      console.log(`Got Identity ID: ${getIdResponse.IdentityId}`);

      // Step 2: Get OpenID token from Identity Pool
      console.log(`Getting OpenID token from Identity Pool`);
      const getOpenIdTokenResponse = await cognitoIdentityClient.send(
        new GetOpenIdTokenCommand({
          IdentityId: getIdResponse.IdentityId,
          Logins: {
            [userPoolProviderName]: userPoolToken,
          },
        })
      );

      if (!getOpenIdTokenResponse.Token) {
        throw new Error('Failed to get OpenID token from Identity Pool');
      }

      console.log(`Got OpenID token, proceeding with AssumeRoleWithWebIdentity`);

      // Step 3: Use Identity Pool OpenID token with AssumeRoleWithWebIdentity
      // Create unique session name for better traceability (must be <= 64 characters)
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits
      const shortTenantId = tenantId.substring(0, 16); // Max 16 chars
      const shortUserId = userId.substring(0, 8); // First 8 chars
      const sessionName = `TS-${shortTenantId}-${shortUserId}-${timestamp}`;

      console.log(`Attempting AssumeRoleWithWebIdentity using Identity Pool token, attempt ${attempt}`);

      const assumeRoleResponse = await stsClient.send(
        new AssumeRoleWithWebIdentityCommand({
          RoleArn: roleArn,
          WebIdentityToken: getOpenIdTokenResponse.Token, // Use Identity Pool token, NOT User Pool JWT
          RoleSessionName: sessionName,
          DurationSeconds: SESSION_DURATION_SECONDS,
        })
      );

      if (!assumeRoleResponse.Credentials) {
        throw new Error(
          `Failed to assume role with web identity. Response: ${JSON.stringify(assumeRoleResponse)}`
        );
      }

      console.log(
        `Successfully assumed role for tenant: ${tenantId}, user: ${userId}`
      );

      return assumeRoleResponse.Credentials;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `AssumeRoleWithWebIdentity attempt ${attempt} failed for tenant: ${tenantId}, user: ${userId}:`,
        {
          error: error,
          errorMessage: (error as Error).message,
          roleArn: roleArn,
          region: process.env.AWS_REGION!,
        }
      );

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        console.log(`Retrying in ${RETRY_DELAY_MS * attempt}ms...`);
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * attempt)
        );
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to assume role after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Build tenant-specific role ARN for same account
 * For cross-account scenarios, role ARNs are retrieved from tenant metadata
 */
export function buildTenantRoleArn(
  accountId: string,
  tenantId: string
): string {
  return `arn:aws:iam::${accountId}:role/TenantRole-${tenantId}`;
}

/**
 * Extract tenant ID from API Gateway event claims
 */
export function extractTenantId(event: APIGatewayProxyEvent): string {
  const tenantId =
    event.requestContext?.authorizer?.claims?.['custom:tenant_id'];

  if (!tenantId) {
    throw new Error('Tenant ID not found in JWT claims');
  }

  return tenantId;
}
