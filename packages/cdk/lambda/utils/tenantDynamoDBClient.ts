import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantCredentials } from './tenantCredentials';
import { isDefaultTenant } from './tenantS3Utils';
import { getTenant } from '../tenantManager';

const stsClient = new STSClient();

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
    throw error; // 元のエラーをそのまま再スローし、エラータイプ情報を保持
  }
}

/**
 * Create a DynamoDB client with tenant-isolated credentials for background jobs
 * Uses STS AssumeRole to access cross-account tenant resources
 * For use in background lambdas that don't have API Gateway events
 * NOTE: No caching to ensure proper security isolation
 * @param tenantId - The tenant ID
 */
export async function createTenantDynamoDBClientForBackgroundJob(
  tenantId: string
): Promise<DynamoDBClient> {
  // Use default credentials for default tenant
  if (isDefaultTenant(tenantId)) {
    return new DynamoDBClient({ region: process.env.AWS_REGION! });
  }

  // Get tenant info to get role ARN and region
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  if (!tenant.roleArn) {
    throw new Error(`Tenant ${tenantId} missing roleArn`);
  }
  if (!tenant.region) {
    throw new Error(`Tenant ${tenantId} missing region`);
  }

  console.log(`Assuming role for tenant ${tenantId}: ${tenant.roleArn}`);

  // Assume tenant role for cross-account access
  try {
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: tenant.roleArn,
      RoleSessionName: `BackgroundJob-${tenantId}`,
    });

    const response = await stsClient.send(assumeRoleCommand);
    if (!response.Credentials) {
      throw new Error(`Failed to assume role for tenant: ${tenantId}`);
    }

    return new DynamoDBClient({
      region: tenant.region,
      credentials: {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
      },
    });
  } catch (error) {
    console.error(
      `Failed to get tenant-specific DynamoDB client for tenant ${tenantId}:`,
      error
    );
    throw new Error(`Cannot access tenant resources: ${error}`);
  }
}
