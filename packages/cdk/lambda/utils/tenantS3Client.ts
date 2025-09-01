import { S3Client } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand, Credentials } from '@aws-sdk/client-sts';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantCredentials } from './tenantCredentials';
import { isDefaultTenant } from './tenantS3Utils';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID!;
const MULTI_TENANT_ROLE_ARN = process.env.MULTI_TENANT_ROLE_ARN!;
const stsClient = new STSClient();

/**
 * Create an S3 client with tenant-isolated credentials from Cognito Identity Pool
 * IAM policies automatically restrict access to tenant-specific resources via principal tags
 * NOTE: No caching to ensure proper user isolation within tenants
 */
export async function createTenantS3Client(
  event: APIGatewayProxyEvent
): Promise<S3Client> {
  try {
    // Get fresh credentials for each request to ensure proper user isolation
    const credentials = await getTenantCredentials(event);

    if (!credentials.AccessKeyId || !credentials.SecretKey) {
      throw new Error(
        'Invalid credentials received from Cognito Identity Pool'
      );
    }

    // Create S3 client with Identity Pool credentials
    return new S3Client({
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretKey,
        sessionToken: credentials.SessionToken,
      },
      region: process.env.AWS_REGION!,
    });
  } catch (error) {
    console.error('Failed to create tenant S3 client:', error);
    throw new Error(`Failed to create tenant-isolated S3 client: ${error}`);
  }
}

/**
 * Create an S3 client with tenant-isolated credentials for background jobs
 * Uses STS AssumeRole with session tags to maintain ABAC security
 * For use in background lambdas that don't have API Gateway events
 * NOTE: No caching to ensure proper security isolation
 */
export async function createTenantS3ClientForBackgroundJob(
  tenantId: string,
  region?: string
): Promise<S3Client> {
  // Use default credentials for default tenant
  if (isDefaultTenant(tenantId)) {
    return new S3Client({ region: region || process.env.AWS_REGION! });
  }

  // Assume multi-tenant role with tenant ID as session tag for ABAC
  try {
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: MULTI_TENANT_ROLE_ARN,
      RoleSessionName: `BackgroundJob-${tenantId}`,
      Tags: [
        {
          Key: 'TenantID',
          Value: tenantId,
        },
      ],
    });

    const response = await stsClient.send(assumeRoleCommand);
    if (!response.Credentials) {
      throw new Error(`Failed to assume role for tenant: ${tenantId}`);
    }

    return new S3Client({
      region: region || process.env.AWS_REGION!,
      credentials: {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
      },
    });
  } catch (error) {
    console.error(
      `Failed to get tenant-specific S3 client for tenant ${tenantId}:`,
      error
    );
    // Fall back to default credentials
    console.warn(`Falling back to default S3 client for tenant: ${tenantId}`);
    return new S3Client({ region: region || process.env.AWS_REGION! });
  }
}
