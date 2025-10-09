import { S3Client } from '@aws-sdk/client-s3';
import { STSClient, AssumeRoleCommand, Credentials } from '@aws-sdk/client-sts';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantCredentials } from './tenantCredentials';
import { isDefaultTenant } from './tenantS3Utils';
import { getTenant } from '../tenantManager';

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
      `Creating S3 client for tenant ${tenant.tenantId} in region ${tenant.region}`
    );

    // Create S3 client with tenant role credentials and tenant's region
    return new S3Client({
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      },
      region: tenant.region,
    });
  } catch (error) {
    console.error('Failed to create tenant S3 client:', error);
    throw new Error(`Failed to create tenant-isolated S3 client: ${error}`);
  }
}

/**
 * Create an S3 client with tenant-isolated credentials for background jobs
 * Assumes the tenant's role to enable cross-account access
 * For use in background lambdas that don't have API Gateway events
 * NOTE: No caching to ensure proper security isolation
 * @param tenantId - The tenant ID (region is fetched from tenant metadata)
 */
export async function createTenantS3ClientForBackgroundJob(
  tenantId: string
): Promise<S3Client> {
  // Use default credentials for default tenant
  if (isDefaultTenant(tenantId)) {
    return new S3Client({ region: process.env.AWS_REGION! });
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

    return new S3Client({
      region: tenant.region,
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
    throw new Error(`Cannot access tenant resources: ${error}`);
  }
}
