import {
  Assistant,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  ListAssistantsResponse,
  AssistantSyncStatus,
} from 'generative-ai-use-cases';
import * as crypto from 'crypto';
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantDynamoDBDocument } from './common';
import { formatAssistantFromDb } from './assistantCommon';

const ASSISTANT_TABLE_NAME = process.env.ASSISTANT_TABLE_NAME!;
const ASSISTANT_ID_INDEX_NAME = process.env.ASSISTANT_ID_INDEX_NAME!;

/**
 * Create a new assistant
 */
export const createAssistant = async (
  _userId: string,
  request: CreateAssistantRequest,
  event: APIGatewayProxyEvent
): Promise<Assistant> => {
  const userId = `user#${_userId}`;
  const assistantId = `assistant#${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Determine sync status based on knowledge sources
  const hasKnowledgeSources = request.knowledgeSources && request.knowledgeSources.length > 0;
  const syncStatus: AssistantSyncStatus = hasKnowledgeSources ? 'RUNNING' : 'SYNCED';

  const item = {
    userId,
    createdDate: now,
    assistantId,
    name: request.name,
    description: request.description,
    instruction: request.instruction,
    modelId: request.modelId,
    ragEnabled: request.ragEnabled,
    syncStatus,
    knowledgeSources: request.knowledgeSources || [],
    s3Urls: request.s3Urls || [],
    updatedDate: now,
  };

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: ASSISTANT_TABLE_NAME,
      Item: item,
    })
  );

  // Return formatted assistant without prefixes
  return {
    assistantId: assistantId.replace('assistant#', ''),
    userId: _userId,
    name: item.name,
    description: item.description,
    instruction: item.instruction,
    modelId: item.modelId,
    ragEnabled: item.ragEnabled,
    syncStatus: item.syncStatus,
    knowledgeSources: item.knowledgeSources,
    s3Urls: item.s3Urls,
    createdDate: item.createdDate,
    updatedDate: item.updatedDate,
  };
};

/**
 * Find an assistant by ID
 */
export const findAssistantById = async (
  _userId: string,
  _assistantId: string,
  event: APIGatewayProxyEvent
): Promise<Assistant | null> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const userId = `user#${_userId}`;
  const assistantId = `assistant#${_assistantId}`;

  // Use GSI to query by assistantId, then filter by userId for tenant isolation
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: ASSISTANT_TABLE_NAME,
      IndexName: ASSISTANT_ID_INDEX_NAME,
      KeyConditionExpression: '#assistantId = :assistantId',
      FilterExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#assistantId': 'assistantId',
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':assistantId': assistantId,
        ':userId': userId,
      },
      Limit: 1,
    })
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  }

  return formatAssistantFromDb(res.Items[0]);
};

/**
 * List assistants for a user
 */
export const listAssistants = async (
  _userId: string,
  event: APIGatewayProxyEvent,
  limit?: number,
  exclusiveStartKey?: string
): Promise<ListAssistantsResponse> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const userId = `user#${_userId}`;

  const parsedStartKey = exclusiveStartKey
    ? JSON.parse(Buffer.from(exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: ASSISTANT_TABLE_NAME,
      KeyConditionExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit || 50,
      ExclusiveStartKey: parsedStartKey,
      ScanIndexForward: false, // Newest first
    })
  );

  const nextToken = res.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
    : undefined;

  return {
    assistants: (res.Items || []).map(formatAssistantFromDb),
    nextToken,
  };
};

/**
 * Update an assistant
 */
export const updateAssistant = async (
  _userId: string,
  _assistantId: string,
  request: UpdateAssistantRequest,
  event: APIGatewayProxyEvent
): Promise<Assistant> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);

  // First, find the assistant to get its createdDate
  const existingAssistant = await findAssistantById(_userId, _assistantId, event);
  if (!existingAssistant) {
    throw new Error(`Assistant ${_assistantId} not found or access denied`);
  }

  const userId = `user#${_userId}`;

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  if (request.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = request.name;
  }

  if (request.description !== undefined) {
    updateExpressions.push('#description = :description');
    expressionAttributeNames['#description'] = 'description';
    expressionAttributeValues[':description'] = request.description;
  }

  if (request.instruction !== undefined) {
    updateExpressions.push('#instruction = :instruction');
    expressionAttributeNames['#instruction'] = 'instruction';
    expressionAttributeValues[':instruction'] = request.instruction;
  }

  if (request.modelId !== undefined) {
    updateExpressions.push('#modelId = :modelId');
    expressionAttributeNames['#modelId'] = 'modelId';
    expressionAttributeValues[':modelId'] = request.modelId;
  }

  if (request.ragEnabled !== undefined) {
    updateExpressions.push('#ragEnabled = :ragEnabled');
    expressionAttributeNames['#ragEnabled'] = 'ragEnabled';
    expressionAttributeValues[':ragEnabled'] = request.ragEnabled;
  }

  if (request.knowledgeSources !== undefined) {
    updateExpressions.push('#knowledgeSources = :knowledgeSources');
    expressionAttributeNames['#knowledgeSources'] = 'knowledgeSources';
    expressionAttributeValues[':knowledgeSources'] = request.knowledgeSources;
  }

  if (request.s3Urls !== undefined) {
    updateExpressions.push('#s3Urls = :s3Urls');
    expressionAttributeNames['#s3Urls'] = 's3Urls';
    expressionAttributeValues[':s3Urls'] = request.s3Urls;
  }

  // Always update updatedDate
  updateExpressions.push('#updatedDate = :updatedDate');
  expressionAttributeNames['#updatedDate'] = 'updatedDate';
  expressionAttributeValues[':updatedDate'] = new Date().toISOString();

  // If knowledge sources or S3 URLs changed, mark as RUNNING for re-indexing
  if (request.knowledgeSources !== undefined || request.s3Urls !== undefined) {
    updateExpressions.push('#syncStatus = :syncStatus');
    expressionAttributeNames['#syncStatus'] = 'syncStatus';
    expressionAttributeValues[':syncStatus'] = 'RUNNING';
  }

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: ASSISTANT_TABLE_NAME,
      Key: {
        userId,
        createdDate: existingAssistant.createdDate,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return formatAssistantFromDb(res.Attributes!);
};

/**
 * Update assistant sync status
 */
export const updateAssistantSyncStatus = async (
  _userId: string,
  _assistantId: string,
  syncStatus: AssistantSyncStatus,
  syncStatusReason: string | undefined,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);

  // First, find the assistant to get its createdDate
  const existingAssistant = await findAssistantById(_userId, _assistantId, event);
  if (!existingAssistant) {
    throw new Error(`Assistant ${_assistantId} not found or access denied`);
  }

  const userId = `user#${_userId}`;

  const updateExpression = syncStatusReason
    ? 'SET #syncStatus = :syncStatus, #syncStatusReason = :syncStatusReason, #updatedDate = :updatedDate'
    : 'SET #syncStatus = :syncStatus, #updatedDate = :updatedDate REMOVE #syncStatusReason';

  const expressionAttributeValues: Record<string, unknown> = {
    ':syncStatus': syncStatus,
    ':updatedDate': new Date().toISOString(),
  };

  if (syncStatusReason) {
    expressionAttributeValues[':syncStatusReason'] = syncStatusReason;
  }

  await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: ASSISTANT_TABLE_NAME,
      Key: {
        userId,
        createdDate: existingAssistant.createdDate,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#syncStatus': 'syncStatus',
        '#syncStatusReason': 'syncStatusReason',
        '#updatedDate': 'updatedDate',
      },
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
};

/**
 * Delete an assistant
 */
export const deleteAssistant = async (
  _userId: string,
  _assistantId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);

  // First, find the assistant to get its createdDate and verify ownership
  const existingAssistant = await findAssistantById(_userId, _assistantId, event);
  if (!existingAssistant) {
    throw new Error(`Assistant ${_assistantId} not found or access denied`);
  }

  const userId = `user#${_userId}`;

  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: ASSISTANT_TABLE_NAME,
      Key: {
        userId,
        createdDate: existingAssistant.createdDate,
      },
    })
  );
};
