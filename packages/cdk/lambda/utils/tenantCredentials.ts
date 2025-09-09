import { APIGatewayProxyEvent } from 'aws-lambda';
import { Credentials } from '@aws-sdk/client-sts';
import {
  assumeRoleWithWebIdentity,
  buildTenantRoleArn,
  extractTenantId,
} from './assumeRoleWithWebIdentity';

// Environment validation helper
const validateEnvironment = () => {
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is not set');
  }
  if (!process.env.AWS_ACCOUNT_ID) {
    throw new Error('AWS_ACCOUNT_ID environment variable is not set');
  }
  return {
    region: process.env.AWS_REGION,
    accountId: process.env.AWS_ACCOUNT_ID,
  };
};

/**
 * Get tenant credentials using AssumeRoleWithWebIdentity
 * This is the new Phase 1 authentication flow that replaces Identity Pool GetCredentialsForIdentity
 * NOTE: No caching to ensure proper user isolation within tenants
 */
export async function getTenantCredentials(
  event: APIGatewayProxyEvent
): Promise<Credentials> {
  // Validate environment variables
  const { region, accountId } = validateEnvironment();

  // Extract tenant ID from JWT claims
  const tenantId = extractTenantId(event);

  // Extract user ID for logging
  const userId =
    event.requestContext?.authorizer?.claims?.['cognito:username'] || 'unknown';

  console.log(
    `Getting tenant credentials for tenant: ${tenantId}, user: ${userId} using AssumeRoleWithWebIdentity`
  );

  try {
    // Phase 1: Build role ARN for same account tenant-specific role
    // Phase 2: This will be replaced with cross-account role ARN retrieval from tenant metadata
    const roleArn = buildTenantRoleArn(accountId, tenantId);

    console.log(`Assuming role: ${roleArn}`);

    // Use AssumeRoleWithWebIdentity to get tenant credentials
    const credentials = await assumeRoleWithWebIdentity(event, roleArn);

    console.log(
      `Successfully obtained tenant credentials for tenant: ${tenantId}, user: ${userId}`
    );

    return credentials;
  } catch (error) {
    console.error(
      `Failed to get tenant credentials for tenant: ${tenantId}, user: ${userId}:`,
      {
        error: error,
        errorMessage: (error as Error).message,
        accountId,
        region,
      }
    );

    throw new Error(`Failed to get tenant credentials: ${(error as Error).message}`);
  }
}
