import {
  AssistantMessage,
  CreateAssistantMessageRequest,
  ListAssistantMessagesResponse,
  AssistantMessageRole,
  AssistantMessageSource,
} from 'generative-ai-use-cases';
import * as crypto from 'crypto';
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantDynamoDBDocument } from './common';
import { formatMessageFromDb } from './assistantCommon';

const ASSISTANT_MESSAGES_TABLE_NAME = process.env.ASSISTANT_MESSAGES_TABLE_NAME!;

/**
 * Create a new assistant message
 */
export const createAssistantMessage = async (
  _userId: string,
  _assistantId: string,
  role: AssistantMessageRole,
  content: string,
  event: APIGatewayProxyEvent,
  sources?: AssistantMessageSource[],
  metadata?: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  }
): Promise<AssistantMessage> => {
  const messageUuid = crypto.randomUUID();
  const now = new Date().toISOString();
  const timestamp = Date.now();

  const assistantId = `assistant#${_assistantId}`;
  const messageId = `${timestamp}#${messageUuid}`;
  const userId = `user#${_userId}`; // Store with prefix for tenant isolation

  const item = {
    assistantId,
    messageId,
    userId,
    role,
    content,
    sources,
    metadata,
    createdDate: now,
  };

  const dynamoDbDocument = await getTenantDynamoDBDocument(event);

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: ASSISTANT_MESSAGES_TABLE_NAME,
      Item: item,
    })
  );

  // Return formatted message without prefixes
  return {
    messageId: messageUuid,
    assistantId: _assistantId,
    userId: _userId,
    role,
    content,
    sources,
    metadata,
    createdDate: now,
  };
};

/**
 * List messages for an assistant
 */
export const listAssistantMessages = async (
  _userId: string,
  _assistantId: string,
  event: APIGatewayProxyEvent,
  limit?: number,
  exclusiveStartKey?: string
): Promise<ListAssistantMessagesResponse> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const assistantId = `assistant#${_assistantId}`;
  const userId = `user#${_userId}`;

  const parsedStartKey = exclusiveStartKey
    ? JSON.parse(Buffer.from(exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: ASSISTANT_MESSAGES_TABLE_NAME,
      KeyConditionExpression: '#assistantId = :assistantId',
      FilterExpression: '#userId = :userId', // Tenant isolation
      ExpressionAttributeNames: {
        '#assistantId': 'assistantId',
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':assistantId': assistantId,
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
    messages: (res.Items || []).map(formatMessageFromDb),
    nextToken,
  };
};

/**
 * Get conversation history (last N messages for context)
 */
export const getConversationHistory = async (
  _userId: string,
  _assistantId: string,
  event: APIGatewayProxyEvent,
  limit: number = 10
): Promise<AssistantMessage[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const assistantId = `assistant#${_assistantId}`;
  const userId = `user#${_userId}`;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: ASSISTANT_MESSAGES_TABLE_NAME,
      KeyConditionExpression: '#assistantId = :assistantId',
      FilterExpression: '#userId = :userId', // Tenant isolation
      ExpressionAttributeNames: {
        '#assistantId': 'assistantId',
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':assistantId': assistantId,
        ':userId': userId,
      },
      Limit: limit,
      ScanIndexForward: false, // Newest first
    })
  );

  const messages = (res.Items || []).map(formatMessageFromDb);

  // Reverse to get chronological order (oldest to newest)
  return messages.reverse();
};

/**
 * Delete all messages for an assistant
 */
export const deleteMessagesForAssistant = async (
  _userId: string,
  _assistantId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const assistantId = `assistant#${_assistantId}`;
  const userId = `user#${_userId}`;

  let exclusiveStartKey: Record<string, any> | undefined;

  // Loop through all pages of results
  do {
    // Query messages with pagination
    const res = await dynamoDbDocument.send(
      new QueryCommand({
        TableName: ASSISTANT_MESSAGES_TABLE_NAME,
        KeyConditionExpression: '#assistantId = :assistantId',
        FilterExpression: '#userId = :userId', // Tenant isolation
        ExpressionAttributeNames: {
          '#assistantId': 'assistantId',
          '#userId': 'userId',
        },
        ExpressionAttributeValues: {
          ':assistantId': assistantId,
          ':userId': userId,
        },
        ProjectionExpression: 'assistantId, messageId',
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    // Delete messages from this page
    if (res.Items && res.Items.length > 0) {
      await Promise.all(
        res.Items.map((item) =>
          dynamoDbDocument.send(
            new DeleteCommand({
              TableName: ASSISTANT_MESSAGES_TABLE_NAME,
              Key: {
                assistantId: item.assistantId,
                messageId: item.messageId,
              },
            })
          )
        )
      );
    }

    // Set up for next page
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);
};
