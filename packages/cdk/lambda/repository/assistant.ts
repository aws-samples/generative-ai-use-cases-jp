import {
  Assistant,
  ListAssistantsResponse,
  CreateAssistantRequest,
  UpdateAssistantRequest,
} from 'generative-ai-use-cases';
import * as crypto from 'crypto';
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  getTenantDynamoDBDocument,
  executeDynamoDBOperation,
  getAssistantTableName,
} from './common';

/**
 * Deep clean an object to remove all undefined values recursively
 * DynamoDB does not allow undefined values in documents
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter((item) => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Normalize knowledge sources by initializing status to QUEUED and clearing error field
 * This ensures consistent state for new or updated knowledge sources
 */
function normalizeKnowledgeSources(
  sources: any[] | undefined
): any[] {
  if (!sources) {
    return [];
  }

  return sources.map((source) => {
    const normalized: any = {
      ...source,
      status: 'QUEUED' as const,
    };
    // Remove error field when resetting to QUEUED to avoid stale error messages
    delete normalized.error;
    return normalized;
  });
}

/**
 * Ensure knowledge sources have default status for backward compatibility
 * Used when reading existing data that may not have status initialized
 */
export function ensureKnowledgeSourceStatus(
  sources: any[] | undefined
): any[] {
  if (!sources) {
    return [];
  }

  return sources.map((source) => ({
    ...source,
    status: source.status ?? ('QUEUED' as const),
    // Keep error if it exists
  }));
}

export const createAssistant = async (
  _userId: string,
  data: CreateAssistantRequest,
  event: APIGatewayProxyEvent
): Promise<Assistant> => {
  const userId = `user#${_userId}`;
  const assistantId = `assistant#${crypto.randomUUID()}`;
  const now = Date.now().toString();

  const item: Assistant = {
    id: userId,
    createdDate: now,
    assistantId,
    userId,
    name: data.name,
    description: data.description,
    instruction: data.instruction,
    modelId: data.modelId,
    ragEnabled: data.ragEnabled,
    syncStatus: 'QUEUED',
    syncStatusReason: '',
    knowledgeSources: normalizeKnowledgeSources(data.knowledgeSources),
    ...(data.s3Urls && { s3Urls: data.s3Urls }),
    updatedDate: now,
  };

  // Deep clean to remove all undefined values
  const cleanedItem = removeUndefinedValues(item);

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: tableName,
      Item: cleanedItem,
    })
  );

  return cleanedItem as Assistant;
};

export const listAssistants = async (
  _userId: string,
  event: APIGatewayProxyEvent,
  _exclusiveStartKey?: string
): Promise<ListAssistantsResponse> => {
  const userId = `user#${_userId}`;
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false,
      Limit: 100,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  // Ensure knowledge sources have default status for backward compatibility
  const assistants = (res.Items || []).map((item: any) => ({
    ...item,
    knowledgeSources: ensureKnowledgeSourceStatus(item.knowledgeSources),
  })) as Assistant[];

  return {
    assistants,
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const getAssistant = async (
  _assistantId: string,
  event: APIGatewayProxyEvent
): Promise<Assistant | null> => {
  const assistantId = _assistantId.startsWith('assistant#')
    ? _assistantId
    : `assistant#${_assistantId}`;
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'AssistantIdIndex',
      KeyConditionExpression: '#assistantId = :assistantId',
      ExpressionAttributeNames: {
        '#assistantId': 'assistantId',
      },
      ExpressionAttributeValues: {
        ':assistantId': assistantId,
      },
    })
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  }

  // Ensure knowledge sources have default status for backward compatibility
  const item = res.Items[0] as any;
  return {
    ...item,
    knowledgeSources: ensureKnowledgeSourceStatus(item.knowledgeSources),
  } as Assistant;
};

export const updateAssistant = async (
  _assistantId: string,
  _userId: string,
  updates: UpdateAssistantRequest,
  event: APIGatewayProxyEvent
): Promise<Assistant> => {
  const assistantId = _assistantId.startsWith('assistant#')
    ? _assistantId
    : `assistant#${_assistantId}`;
  const userId = `user#${_userId}`;

  // First get the assistant to get the createdDate (sort key)
  const existing = await getAssistant(_assistantId, event);
  if (!existing) {
    throw new Error('Assistant not found');
  }

  // Verify ownership
  if (existing.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  // Build update expression
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }
  if (updates.description !== undefined) {
    updateExpressions.push('#description = :description');
    expressionAttributeNames['#description'] = 'description';
    expressionAttributeValues[':description'] = updates.description;
  }
  if (updates.instruction !== undefined) {
    updateExpressions.push('#instruction = :instruction');
    expressionAttributeNames['#instruction'] = 'instruction';
    expressionAttributeValues[':instruction'] = updates.instruction;
  }
  if (updates.modelId !== undefined) {
    updateExpressions.push('#modelId = :modelId');
    expressionAttributeNames['#modelId'] = 'modelId';
    expressionAttributeValues[':modelId'] = updates.modelId;
  }
  if (updates.ragEnabled !== undefined) {
    updateExpressions.push('#ragEnabled = :ragEnabled');
    expressionAttributeNames['#ragEnabled'] = 'ragEnabled';
    expressionAttributeValues[':ragEnabled'] = updates.ragEnabled;
  }
  if (updates.knowledgeSources !== undefined) {
    updateExpressions.push('#knowledgeSources = :knowledgeSources');
    expressionAttributeNames['#knowledgeSources'] = 'knowledgeSources';
    expressionAttributeValues[':knowledgeSources'] = removeUndefinedValues(
      normalizeKnowledgeSources(updates.knowledgeSources)
    );
  }
  if (updates.s3Urls !== undefined) {
    updateExpressions.push('#s3Urls = :s3Urls');
    expressionAttributeNames['#s3Urls'] = 's3Urls';
    expressionAttributeValues[':s3Urls'] = updates.s3Urls;
  }

  // Always update updatedDate
  updateExpressions.push('#updatedDate = :updatedDate');
  expressionAttributeNames['#updatedDate'] = 'updatedDate';
  expressionAttributeValues[':updatedDate'] = Date.now().toString();

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        userId: existing.id,
        createdDate: existing.createdDate,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  // Ensure knowledge sources have default status for backward compatibility
  const updated = res.Attributes as any;
  return {
    ...updated,
    knowledgeSources: ensureKnowledgeSourceStatus(updated.knowledgeSources),
  } as Assistant;
};

/**
 * Update the status of a specific knowledge source
 * Used during document ingestion to track per-source progress
 *
 * Uses primary key to avoid GSI eventual consistency issues immediately after creation
 * IMPORTANT: Mutates the assistant.knowledgeSources array to prevent stale updates
 */
export const updateKnowledgeSourceStatus = async (
  assistant: Assistant,
  sourceId: string,
  status: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED',
  error: string | undefined,
  event: APIGatewayProxyEvent
): Promise<void> => {
  // Update the specific knowledge source
  const updatedSources = (assistant.knowledgeSources || []).map((source) => {
    if (source.id === sourceId) {
      const updated: any = { ...source, status };
      if (error !== undefined) {
        updated.error = error;
      } else {
        // Clear error field when no error is provided (e.g., when transitioning to SYNCING/SUCCEEDED)
        delete updated.error;
      }
      return updated;
    }
    return source;
  });

  // Deep clean to remove all undefined values
  const cleanedSources = removeUndefinedValues(updatedSources);

  // Save updated sources using primary key (avoids GSI lookup)
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        userId: assistant.id,
        createdDate: assistant.createdDate,
      },
      UpdateExpression:
        'SET #knowledgeSources = :knowledgeSources, #updatedDate = :updatedDate',
      ExpressionAttributeNames: {
        '#knowledgeSources': 'knowledgeSources',
        '#updatedDate': 'updatedDate',
      },
      ExpressionAttributeValues: {
        ':knowledgeSources': cleanedSources,
        ':updatedDate': Date.now().toString(),
      },
    })
  );

  // Update in-memory object to prevent stale writes on subsequent calls
  assistant.knowledgeSources = cleanedSources;
};

/**
 * Update the overall sync status of an assistant based on its knowledge sources
 * Aggregates individual source statuses to determine overall state
 */
export const updateAssistantSyncStatus = async (
  assistant: Assistant,
  event: APIGatewayProxyEvent
): Promise<void> => {
  // Get all knowledge source statuses
  const sources = assistant.knowledgeSources || [];

  let syncStatus: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL' = 'QUEUED';

  if (sources.length === 0) {
    // No sources means no indexing needed
    syncStatus = 'SUCCEEDED';
  } else {
    const statuses = sources.map(s => s.status || 'QUEUED');
    const hasQueued = statuses.some(s => s === 'QUEUED');
    const hasSyncing = statuses.some(s => s === 'SYNCING');
    const hasFailed = statuses.some(s => s === 'FAILED');
    const hasSucceeded = statuses.some(s => s === 'SUCCEEDED');
    const allSucceeded = statuses.every(s => s === 'SUCCEEDED');
    const allFailed = statuses.every(s => s === 'FAILED');

    if (hasQueued || hasSyncing) {
      syncStatus = 'SYNCING';
    } else if (allSucceeded) {
      syncStatus = 'SUCCEEDED';
    } else if (allFailed) {
      syncStatus = 'FAILED';
    } else if (hasSucceeded && hasFailed) {
      syncStatus = 'PARTIAL';
    } else {
      syncStatus = 'FAILED';
    }
  }

  // Update assistant record
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        userId: assistant.id,
        createdDate: assistant.createdDate,
      },
      UpdateExpression: 'SET #syncStatus = :syncStatus, #updatedDate = :updatedDate',
      ExpressionAttributeNames: {
        '#syncStatus': 'syncStatus',
        '#updatedDate': 'updatedDate',
      },
      ExpressionAttributeValues: {
        ':syncStatus': syncStatus,
        ':updatedDate': Date.now().toString(),
      },
    })
  );

  // Update in-memory object
  assistant.syncStatus = syncStatus;
};

export const deleteAssistant = async (
  _assistantId: string,
  _userId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const assistantId = _assistantId.startsWith('assistant#')
    ? _assistantId
    : `assistant#${_assistantId}`;
  const userId = `user#${_userId}`;

  // First get the assistant to verify ownership and get keys
  const existing = await getAssistant(_assistantId, event);
  if (!existing) {
    throw new Error('Assistant not found');
  }

  // Verify ownership
  if (existing.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        userId: existing.id,
        createdDate: existing.createdDate,
      },
    })
  );
};
