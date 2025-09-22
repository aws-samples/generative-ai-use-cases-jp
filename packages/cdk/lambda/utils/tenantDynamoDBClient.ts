import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantCredentials } from './tenantCredentials';

/**
 * Create a DynamoDB client with tenant-isolated credentials from Cognito Identity Pool
 * IAM policies automatically restrict access to tenant-specific resources via principal tags
 * NOTE: No caching to ensure proper user isolation within tenants
 */
export async function createTenantDynamoDBClient(
  event: APIGatewayProxyEvent
): Promise<DynamoDBClient> {
  try {
    // Get fresh credentials and tenant info for each request to ensure proper user isolation
    const { credentials, tenant } = await getTenantCredentials(event);

    if (!credentials.AccessKeyId || !credentials.SecretAccessKey) {
      throw new Error(
        'Invalid credentials received from AssumeRoleWithWebIdentity'
      );
    }

    if (!tenant.region) {
      throw new Error(
        `Tenant ${tenant.tenantId} is missing region information`
      );
    }

    console.log(
      `Creating DynamoDB client for tenant ${tenant.tenantId} in region ${tenant.region}`
    );

    // Create DynamoDB client with tenant role credentials and tenant's region
    return new DynamoDBClient({
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      },
      region: tenant.region,
    });
  } catch (error) {
    console.error('Failed to create tenant DynamoDB client:', error);
    throw new Error(
      `Failed to create tenant-isolated DynamoDB client: ${error}`
    );
  }
}
