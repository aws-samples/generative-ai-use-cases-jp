import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
}

// Request interfaces
interface RegisterTenantRequest {
  tenantId: string;
  region?: string;
  environment?: string;
  metadata?: Record<string, any>;
  accountId: string;
  roleArn: string;
}

interface UpdateTenantRequest {
  tenantId: string;
  status?: TenantStatus;
  region?: string;
  metadata?: Record<string, any>;
  accountId?: string;
  roleArn?: string;
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

    const now = new Date().toISOString();
    const updateExpression: string[] = [];
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

    // Always update updatedAt
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    const response = await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TENANTS_TABLE_NAME,
        Key: marshall({ tenantId: request.tenantId }),
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
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

