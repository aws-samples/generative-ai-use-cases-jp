import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { HiddenUseCases, IpAccessControl } from 'generative-ai-use-cases';

// Environment variables
const TENANTS_TABLE_NAME = process.env.TENANTS_TABLE_NAME!;

// DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION! });

// Tenant status enum
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PROVISIONING = 'provisioning',
  ERROR = 'error',
}

// Tenant interface
export interface Tenant {
  tenantId: string;
  status: TenantStatus;
  region: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  accountId: string;
  roleArn: string;
  useCaseConfiguration?: {
    hiddenUseCases: HiddenUseCases;
    updatedAt: string;
    updatedBy: string;
  };
  ipAccessControl?: IpAccessControl;
  openSearchDomainArn?: string;
  openSearchEndpoint?: string;
  openSearchIndexName?: string;
}

// Request interfaces
interface RegisterTenantRequest {
  tenantId: string;
  region?: string;
  environment?: string;
  metadata?: Record<string, any>;
  accountId: string;
  roleArn: string;
  ipAccessControl?: IpAccessControl;
}

interface UpdateTenantRequest {
  tenantId: string;
  status?: TenantStatus;
  region?: string;
  metadata?: Record<string, any>;
  accountId?: string;
  roleArn?: string;
  ipAccessControl?: IpAccessControl;
  openSearchDomainArn?: string | null;
  openSearchEndpoint?: string | null;
  openSearchIndexName?: string | null;
}

/**
 * Get tenant information by tenant ID
 */
export async function getTenant(tenantId: string): Promise<Tenant | null> {
  try {
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TENANTS_TABLE_NAME,
        Key: marshall({ tenantId }),
      })
    );

    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item) as Tenant;
  } catch (error) {
    console.error(`Failed to get tenant ${tenantId}:`, error);
    throw new Error(`Failed to get tenant: ${error}`);
  }
}

/**
 * Register a new tenant
 */
export async function registerTenant(
  request: RegisterTenantRequest
): Promise<Tenant> {
  const now = new Date().toISOString();
  const tenant: Tenant = {
    tenantId: request.tenantId,
    status: TenantStatus.PROVISIONING,
    region: request.region || process.env.AWS_REGION!,
    environment: request.environment || process.env.ENVIRONMENT!,
    createdAt: now,
    updatedAt: now,
    metadata: request.metadata || {},
    accountId: request.accountId,
    roleArn: request.roleArn,
  };

  // Add IP access control if provided
  if (request.ipAccessControl) {
    tenant.ipAccessControl = {
      ...request.ipAccessControl,
      updatedAt: now,
      updatedBy: 'cdk-deployment',
    };
  }

  try {
    // Check if tenant already exists
    const existing = await getTenant(request.tenantId);
    if (existing) {
      throw new Error(`Tenant ${request.tenantId} already exists`);
    }

    await dynamoClient.send(
      new PutItemCommand({
        TableName: TENANTS_TABLE_NAME,
        Item: marshall(tenant),
        ConditionExpression: 'attribute_not_exists(tenantId)',
      })
    );

    console.log(`Successfully registered tenant: ${request.tenantId}`);
    return tenant;
  } catch (error) {
    console.error(`Failed to register tenant ${request.tenantId}:`, error);
    throw new Error(`Failed to register tenant: ${error}`);
  }
}

/**
 * Update tenant information
 */
export async function updateTenant(
  request: UpdateTenantRequest
): Promise<Tenant> {
  try {
    // Check if tenant exists
    const existing = await getTenant(request.tenantId);
    if (!existing) {
      throw new Error(`Tenant ${request.tenantId} not found`);
    }

    // Validate OpenSearch fields - all must be provided together or all must be null/empty for removal
    const { openSearchDomainArn, openSearchEndpoint, openSearchIndexName } =
      request;
    const hasOpenSearchArn = openSearchDomainArn !== undefined;
    const hasOpenSearchEndpoint = openSearchEndpoint !== undefined;
    const hasOpenSearchIndex = openSearchIndexName !== undefined;

    if (hasOpenSearchArn || hasOpenSearchEndpoint || hasOpenSearchIndex) {
      // If any OpenSearch field is being updated, all three must be provided
      if (!(hasOpenSearchArn && hasOpenSearchEndpoint && hasOpenSearchIndex)) {
        throw new Error(
          'All OpenSearch fields (domainArn, endpoint, indexName) must be updated together'
        );
      }

      // If updating (not removing), validate the values
      if (openSearchDomainArn && openSearchEndpoint && openSearchIndexName) {
        if (
          !openSearchEndpoint.startsWith('https://') ||
          !openSearchEndpoint.includes('.amazonaws.com')
        ) {
          throw new Error(
            'OpenSearch endpoint must be an HTTPS URL from amazonaws.com domain'
          );
        }

        // Validate region match
        const arnMatch = openSearchDomainArn.match(/arn:aws:es:([^:]+):/);
        const endpointMatch = openSearchEndpoint.match(
          /\.([^.]+)\.es\.amazonaws\.com/
        );

        if (arnMatch && endpointMatch && arnMatch[1] !== endpointMatch[1]) {
          throw new Error(
            'OpenSearch endpoint region must match domain ARN region'
          );
        }
      }
    }

    const now = new Date().toISOString();
    const updateExpression: string[] = [];
    const removeExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression dynamically
    if (request.status !== undefined) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = request.status;
    }

    if (request.region !== undefined) {
      updateExpression.push('#region = :region');
      expressionAttributeNames['#region'] = 'region';
      expressionAttributeValues[':region'] = request.region;
    }

    if (request.metadata !== undefined) {
      updateExpression.push('#metadata = :metadata');
      expressionAttributeNames['#metadata'] = 'metadata';
      expressionAttributeValues[':metadata'] = request.metadata;
    }

    // Cross-account fields
    if (request.accountId !== undefined) {
      updateExpression.push('#accountId = :accountId');
      expressionAttributeNames['#accountId'] = 'accountId';
      expressionAttributeValues[':accountId'] = request.accountId;
    }

    if (request.roleArn !== undefined) {
      updateExpression.push('#roleArn = :roleArn');
      expressionAttributeNames['#roleArn'] = 'roleArn';
      expressionAttributeValues[':roleArn'] = request.roleArn;
    }

    // IP access control
    if (request.ipAccessControl !== undefined) {
      updateExpression.push('#ipAccessControl = :ipAccessControl');
      expressionAttributeNames['#ipAccessControl'] = 'ipAccessControl';
      expressionAttributeValues[':ipAccessControl'] = {
        ...request.ipAccessControl,
        updatedAt: now,
        updatedBy: 'cdk-deployment',
      };
    }

    // OpenSearch fields - handle both update and removal
    if (hasOpenSearchArn && hasOpenSearchEndpoint && hasOpenSearchIndex) {
      if (openSearchDomainArn && openSearchEndpoint && openSearchIndexName) {
        // Update OpenSearch fields
        updateExpression.push('#openSearchDomainArn = :openSearchDomainArn');
        updateExpression.push('#openSearchEndpoint = :openSearchEndpoint');
        updateExpression.push('#openSearchIndexName = :openSearchIndexName');
        expressionAttributeNames['#openSearchDomainArn'] =
          'openSearchDomainArn';
        expressionAttributeNames['#openSearchEndpoint'] = 'openSearchEndpoint';
        expressionAttributeNames['#openSearchIndexName'] =
          'openSearchIndexName';
        expressionAttributeValues[':openSearchDomainArn'] = openSearchDomainArn;
        expressionAttributeValues[':openSearchEndpoint'] = openSearchEndpoint;
        expressionAttributeValues[':openSearchIndexName'] = openSearchIndexName;
      } else {
        // Remove OpenSearch fields (all are null)
        removeExpression.push('#openSearchDomainArn');
        removeExpression.push('#openSearchEndpoint');
        removeExpression.push('#openSearchIndexName');
        expressionAttributeNames['#openSearchDomainArn'] =
          'openSearchDomainArn';
        expressionAttributeNames['#openSearchEndpoint'] = 'openSearchEndpoint';
        expressionAttributeNames['#openSearchIndexName'] =
          'openSearchIndexName';
      }
    }

    // Always update updatedAt
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    // Build final update expression
    let finalUpdateExpression = '';
    if (updateExpression.length > 0) {
      finalUpdateExpression = `SET ${updateExpression.join(', ')}`;
    }
    if (removeExpression.length > 0) {
      finalUpdateExpression += ` REMOVE ${removeExpression.join(', ')}`;
    }

    const response = await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TENANTS_TABLE_NAME,
        Key: marshall({ tenantId: request.tenantId }),
        UpdateExpression: finalUpdateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW',
      })
    );

    const updatedTenant = unmarshall(response.Attributes!) as Tenant;
    console.log(`Successfully updated tenant: ${request.tenantId}`);
    return updatedTenant;
  } catch (error) {
    console.error(`Failed to update tenant ${request.tenantId}:`, error);
    throw new Error(`Failed to update tenant: ${error}`);
  }
}

/**
 * Deactivate a tenant
 */
export async function deactivateTenant(tenantId: string): Promise<Tenant> {
  return updateTenant({
    tenantId,
    status: TenantStatus.INACTIVE,
  });
}

/**
 * Get tenant use case configuration with fallback to global configuration
 */
export async function getTenantUseCaseConfiguration(
  tenantId: string,
  globalHiddenUseCases: HiddenUseCases = {}
): Promise<HiddenUseCases> {
  try {
    const tenant = await getTenant(tenantId);

    // Return tenant-specific configuration if it exists, otherwise return global configuration
    return tenant?.useCaseConfiguration?.hiddenUseCases ?? globalHiddenUseCases;
  } catch (error) {
    console.error(
      `Failed to get use case configuration for tenant ${tenantId}:`,
      error
    );
    // Return global configuration as fallback on error
    return globalHiddenUseCases;
  }
}
