/**
 * Utility to get tenant-specific PPTX resource names
 * Reuses existing tenant S3 utilities for bucket name generation
 */

import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
  extractAccountIdFromRoleArn,
} from '../utils/tenantS3Utils';
import { getTenant } from '../tenantManager';

const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID!;
const AWS_REGION = process.env.AWS_REGION!;

/**
 * Sanitize tenant ID for use in resource names
 * Matches the sanitization logic in pptx-db.ts
 */
function sanitizeTenantId(tenantId: string): string {
  return tenantId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

/**
 * Get the DynamoDB table name for PPTX templates for a specific tenant
 */
export function getPptxTemplatesTableName(tenantId: string): string {
  const sanitizedTenantId = sanitizeTenantId(tenantId);
  return `pptx-templates-${ENVIRONMENT}-${sanitizedTenantId}`;
}

/**
 * Get the DynamoDB table name for PPTX generations for a specific tenant
 */
export function getPptxGenerationsTableName(tenantId: string): string {
  const sanitizedTenantId = sanitizeTenantId(tenantId);
  return `pptx-generations-${ENVIRONMENT}-${sanitizedTenantId}`;
}

/**
 * Get the S3 bucket name for PPTX templates for a specific tenant
 * Uses existing tenant S3 utilities for deterministic bucket name generation
 * Format: {baseName}-{environment}-tenant-{tenantId}-{guidHash}
 */
export async function getPptxTemplatesBucketName(
  tenantId: string
): Promise<string> {
  // For default tenant, use main account ID
  if (isDefaultTenant(tenantId)) {
    return getTenantBucketNameByTenantId(
      tenantId,
      'pptx-templates',
      '', // No fallback bucket
      AWS_ACCOUNT_ID,
      AWS_REGION,
      ENVIRONMENT
    );
  }

  // For tenant users, get tenant account ID from tenant record
  try {
    const tenant = await getTenant(tenantId);
    if (!tenant?.roleArn) {
      throw new Error(`Tenant ${tenantId} missing role ARN`);
    }

    const tenantAccountId = extractAccountIdFromRoleArn(tenant.roleArn);
    if (!tenantAccountId || !tenant.region || !tenant.environment) {
      throw new Error(
        `Incomplete tenant information for ${tenantId}: accountId=${tenantAccountId}, region=${tenant.region}, environment=${tenant.environment}`
      );
    }

    console.log(
      `Using tenant account ID for bucket name generation: ${tenantAccountId}`
    );

    return getTenantBucketNameByTenantId(
      tenantId,
      'pptx-templates',
      '', // No fallback bucket
      tenantAccountId,
      tenant.region,
      tenant.environment
    );
  } catch (error) {
    console.error(`Failed to get tenant info for ${tenantId}:`, error);
    throw new Error(`Cannot generate PPTX templates bucket name: ${error}`);
  }
}

/**
 * Get the S3 bucket name for PPTX outputs for a specific tenant
 * Uses existing tenant S3 utilities for deterministic bucket name generation
 * Format: {baseName}-{environment}-tenant-{tenantId}-{guidHash}
 */
export async function getPptxOutputsBucketName(
  tenantId: string
): Promise<string> {
  // For default tenant, use main account ID
  if (isDefaultTenant(tenantId)) {
    return getTenantBucketNameByTenantId(
      tenantId,
      'pptx-outputs',
      '', // No fallback bucket
      AWS_ACCOUNT_ID,
      AWS_REGION,
      ENVIRONMENT
    );
  }

  // For tenant users, get tenant account ID from tenant record
  try {
    const tenant = await getTenant(tenantId);
    if (!tenant?.roleArn) {
      throw new Error(`Tenant ${tenantId} missing role ARN`);
    }

    const tenantAccountId = extractAccountIdFromRoleArn(tenant.roleArn);
    if (!tenantAccountId || !tenant.region || !tenant.environment) {
      throw new Error(
        `Incomplete tenant information for ${tenantId}: accountId=${tenantAccountId}, region=${tenant.region}, environment=${tenant.environment}`
      );
    }

    console.log(
      `Using tenant account ID for bucket name generation: ${tenantAccountId}`
    );

    return getTenantBucketNameByTenantId(
      tenantId,
      'pptx-outputs',
      '', // No fallback bucket
      tenantAccountId,
      tenant.region,
      tenant.environment
    );
  } catch (error) {
    console.error(`Failed to get tenant info for ${tenantId}:`, error);
    throw new Error(`Cannot generate PPTX outputs bucket name: ${error}`);
  }
}
