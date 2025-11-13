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
import { getTenantId } from '../utils/tenantUtils';

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
function normalizeKnowledgeSources(sources: any[] | undefined): any[] {
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
export function ensureKnowledgeSourceStatus(sources: any[] | undefined): any[] {
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
  const tenantId = getTenantId(event);

  // Validate and normalize visibility
  let visibility: 'private' | 'public' = 'private';
  if (data.visibility) {
    const normalizedVisibility = data.visibility.toLowerCase();
    if (
      normalizedVisibility !== 'private' &&
      normalizedVisibility !== 'public'
    ) {
      throw new Error(
        `Invalid visibility value: ${data.visibility}. Must be 'private' or 'public'.`
      );
    }
    visibility = normalizedVisibility as 'private' | 'public';
  }

  const item: Assistant = {
    id: userId,
    createdDate: now,
    assistantId,
    userId,
    tenantId: `tenant#${tenantId}`,
    name: data.name,
    description: data.description,
    instruction: data.instruction,
    modelId: data.modelId,
    ragEnabled: data.ragEnabled,
    visibility,
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
  _exclusiveStartKey?: string,
  limit: number = 100
): Promise<ListAssistantsResponse> => {
  const userId = `user#${_userId}`;
  const tenantId = getTenantId(event);
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantTableName(event);

  // Parse pagination tokens for both queries
  // Format: base64({ owned: {...}, public: {...} })
  let ownedStartKey: any = undefined;
  let publicStartKey: any = undefined;

  if (_exclusiveStartKey) {
    try {
      const parsed = JSON.parse(
        Buffer.from(_exclusiveStartKey, 'base64').toString()
      );
      // Check for composite format
      if (parsed.owned !== undefined || parsed.public !== undefined) {
        ownedStartKey = parsed.owned;
        publicStartKey = parsed.public;
      } else {
        // Reject legacy format to prevent pagination issues
        throw new Error('Invalid pagination token format');
      }
    } catch (e) {
      throw new Error('Invalid pagination token');
    }
  }

  // Fetch more data than limit to ensure we have enough after merging
  // Use limit * 2 for each source to handle cases where items get filtered out
  const fetchLimit = limit * 2;

  // Query owned assistants
  const ownedRes = await dynamoDbDocument.send(
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
      Limit: fetchLimit,
      ExclusiveStartKey: ownedStartKey,
    })
  );

  // Query public assistants with loop to handle FilterExpression pagination
  const publicItems: any[] = [];
  let currentPublicStartKey = publicStartKey;
  let publicLastEvaluatedKey: any = undefined;

  // Keep fetching until we have enough items or exhaust results
  while (publicItems.length < fetchLimit) {
    const res = await dynamoDbDocument.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'TenantVisibilityIndex',
        KeyConditionExpression: '#tenantId = :tenantId',
        FilterExpression: '#visibility = :public AND #userId <> :userId',
        ExpressionAttributeNames: {
          '#tenantId': 'tenantId',
          '#visibility': 'visibility',
          '#userId': 'userId',
        },
        ExpressionAttributeValues: {
          ':tenantId': `tenant#${tenantId}`,
          ':public': 'public',
          ':userId': userId,
        },
        ScanIndexForward: false,
        Limit: Math.min(100, fetchLimit * 2), // Cap chunk size
        ExclusiveStartKey: currentPublicStartKey,
      })
    );

    // Add items from this batch
    if (res.Items && res.Items.length > 0) {
      publicItems.push(...res.Items);
    }

    publicLastEvaluatedKey = res.LastEvaluatedKey;

    // Stop if no more results or we have enough
    if (!res.LastEvaluatedKey || publicItems.length >= fetchLimit) {
      break;
    }

    // Continue fetching
    currentPublicStartKey = res.LastEvaluatedKey;
  }

  // Merge and deduplicate by assistantId
  const assistantMap = new Map<string, any>();

  // Track which source each assistant came from for cursor tracking
  const assistantSources = new Map<string, 'owned' | 'public'>();

  // Add owned assistants first (they take precedence)
  for (const item of ownedRes.Items || []) {
    assistantMap.set(item.assistantId, item);
    assistantSources.set(item.assistantId, 'owned');
  }

  // Add public assistants (skip if already exists)
  for (const item of publicItems) {
    if (!assistantMap.has(item.assistantId)) {
      assistantMap.set(item.assistantId, item);
      assistantSources.set(item.assistantId, 'public');
    }
  }

  // Convert to array and ensure knowledge sources have default status
  let assistants = Array.from(assistantMap.values())
    .map((item: any) => ({
      ...item,
      knowledgeSources: ensureKnowledgeSourceStatus(item.knowledgeSources),
    }))
    .sort(
      (a, b) => parseInt(b.createdDate) - parseInt(a.createdDate)
    ) as Assistant[];

  // Enforce global limit on merged results
  assistants = assistants.slice(0, limit);

  // Build cursors based on the LAST ITEM FROM EACH SOURCE that made it into the response
  let finalOwnedCursor: any = undefined;
  let finalPublicCursor: any = undefined;

  // Find the last owned and public items in the response
  for (let i = assistants.length - 1; i >= 0; i--) {
    const assistant = assistants[i];
    const source = assistantSources.get(assistant.assistantId);

    if (source === 'owned' && !finalOwnedCursor) {
      // Found last owned item - build cursor from it
      finalOwnedCursor = {
        userId: `user#${_userId}`,
        createdDate: assistant.createdDate,
      };
    }

    if (source === 'public' && !finalPublicCursor) {
      // Found last public item - build cursor from it
      finalPublicCursor = {
        tenantId: assistant.tenantId,
        createdDate: assistant.createdDate,
        userId: assistant.id, // id contains userId with prefix
      };
    }

    // Stop once we've found both
    if (finalOwnedCursor && finalPublicCursor) {
      break;
    }
  }

  // If we didn't find any items from a source in the response,
  // but the source still has more data, use the original LastEvaluatedKey
  if (!finalOwnedCursor && ownedRes.LastEvaluatedKey) {
    finalOwnedCursor = ownedRes.LastEvaluatedKey;
  }
  if (!finalPublicCursor && publicLastEvaluatedKey && publicItems.length > 0) {
    finalPublicCursor = publicLastEvaluatedKey;
  }

  // Build composite pagination token ONLY if either source has more data
  let nextToken: string | undefined;
  if (finalOwnedCursor || finalPublicCursor) {
    const compositeKey = {
      owned: finalOwnedCursor,
      public: finalPublicCursor,
    };
    nextToken = Buffer.from(JSON.stringify(compositeKey)).toString('base64');
  }

  return {
    assistants,
    lastEvaluatedKey: nextToken,
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
  if (updates.visibility !== undefined) {
    // Validate and normalize visibility
    const normalizedVisibility = updates.visibility.toLowerCase();
    if (
      normalizedVisibility !== 'private' &&
      normalizedVisibility !== 'public'
    ) {
      throw new Error(
        `Invalid visibility value: ${updates.visibility}. Must be 'private' or 'public'.`
      );
    }
    updateExpressions.push('#visibility = :visibility');
    expressionAttributeNames['#visibility'] = 'visibility';
    expressionAttributeValues[':visibility'] = normalizedVisibility;
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

  let syncStatus: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL' =
    'QUEUED';

  if (sources.length === 0) {
    // No sources means no indexing needed
    syncStatus = 'SUCCEEDED';
  } else {
    const statuses = sources.map((s) => s.status || 'QUEUED');
    const hasQueued = statuses.some((s) => s === 'QUEUED');
    const hasSyncing = statuses.some((s) => s === 'SYNCING');
    const hasFailed = statuses.some((s) => s === 'FAILED');
    const hasSucceeded = statuses.some((s) => s === 'SUCCEEDED');
    const allSucceeded = statuses.every((s) => s === 'SUCCEEDED');
    const allFailed = statuses.every((s) => s === 'FAILED');

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
      UpdateExpression:
        'SET #syncStatus = :syncStatus, #updatedDate = :updatedDate',
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
