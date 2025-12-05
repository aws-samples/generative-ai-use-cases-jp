import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantId } from '../utils/tenantUtils';
import { createTenantDynamoDBClient } from '../utils/tenantDynamoDBClient';
import {
  TooManyRequestsError,
  ServiceUnavailableError,
  isRateLimitError,
} from '../utils/errors';

const TABLE_PREFIX: string = process.env.TABLE_NAME!;
const ENVIRONMENT: string = process.env.ENVIRONMENT!;
const DEFAULT_TABLE_NAME: string = process.env.DEFAULT_TABLE_NAME!;
const STATS_TABLE_PREFIX: string = process.env.STATS_TABLE_NAME!;
const DEFAULT_STATS_TABLE_NAME: string = process.env.DEFAULT_STATS_TABLE_NAME!;
const ASSISTANT_TABLE_PREFIX: string =
  process.env.ASSISTANT_TABLE_NAME || 'Assistant';
const DEFAULT_ASSISTANT_TABLE_NAME: string =
  process.env.DEFAULT_ASSISTANT_TABLE_NAME || '';

/**
 * Get or create a tenant-specific DynamoDB document client
 * Throws TooManyRequestsError (429) for rate limit errors
 * Throws ServiceUnavailableError (503) for other tenant authentication failures
 */
export async function getTenantDynamoDBDocument(
  event: APIGatewayProxyEvent
): Promise<DynamoDBDocumentClient> {
  const tenantId = getTenantId(event);

  // For default tenant, use standard DynamoDB client
  if (!tenantId || tenantId === 'default') {
    // Create standard DynamoDB client without AssumeRole
    return DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  try {
    // Try to create client with tenant credentials
    // Each request gets fresh credentials to ensure proper user isolation
    const dynamoDb = await createTenantDynamoDBClient(event);
    return DynamoDBDocumentClient.from(dynamoDb);
  } catch (error) {
    console.error('Failed to create tenant DynamoDB client:', error);

    // レート制限エラーの場合は 429 を返す
    if (isRateLimitError(error)) {
      throw new TooManyRequestsError(
        'サービスが一時的に混雑しています。しばらく待ってから再試行してください。',
        30 // 30秒後にリトライ推奨
      );
    }

    // その他のエラーは 503 を返す
    throw new ServiceUnavailableError(
      'テナント認証に失敗しました。しばらく待ってから再試行してください。'
    );
  }
}

/**
 * Get tenant-specific table name
 * Note: Tenant ID extraction is only for constructing the correct table name.
 * Security/isolation is enforced by IAM policies using session tags from the JWT.
 */
export function getTableName(event: APIGatewayProxyEvent): string {
  const tenantId = getTenantId(event);

  // For default/fallback users, use the actual CDK-generated table name
  if (!tenantId || tenantId === 'default') {
    return DEFAULT_TABLE_NAME;
  }

  // For tenant users, construct tenant-specific table name directly
  return `${TABLE_PREFIX}-${ENVIRONMENT}-tenant-${tenantId}`;
}

/**
 * Get tenant-specific stats table name
 */
export function getStatsTableName(event: APIGatewayProxyEvent): string {
  const tenantId = getTenantId(event);

  // For default/fallback users, use the actual CDK-generated stats table name
  if (!tenantId || tenantId === 'default') {
    return DEFAULT_STATS_TABLE_NAME;
  }

  // For tenant users, construct tenant-specific stats table name directly
  return `${STATS_TABLE_PREFIX}-${ENVIRONMENT}-tenant-${tenantId}`;
}

/**
 * Get tenant-specific assistant table name
 */
export function getAssistantTableName(event: APIGatewayProxyEvent): string {
  const tenantId = getTenantId(event);

  if (!tenantId || tenantId === 'default') {
    return DEFAULT_ASSISTANT_TABLE_NAME;
  }

  return `${ASSISTANT_TABLE_PREFIX}-${ENVIRONMENT}-tenant-${tenantId}`;
}

/**
 * Execute DynamoDB operation with proper tenant table selection
 */
export async function executeDynamoDBOperation<T>(
  event: APIGatewayProxyEvent,
  operation: (client: DynamoDBDocumentClient, tableName: string) => Promise<T>
): Promise<T> {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  return await operation(dynamoDbDocument, tableName);
}
