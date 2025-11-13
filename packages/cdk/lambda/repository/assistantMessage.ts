import {
  AssistantMessage,
  AssistantMessageSource,
  ListAssistantMessagesResponse,
} from 'generative-ai-use-cases';
import * as crypto from 'crypto';
import {
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  getTenantDynamoDBDocument,
  getAssistantMessagesTableName,
} from './common';

export const createMessage = async (
  _assistantId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: AssistantMessageSource[],
  metadata?: AssistantMessage['metadata'],
  event?: APIGatewayProxyEvent
): Promise<AssistantMessage> => {
  const assistantId = `assistant#${_assistantId}`;
  const timestamp = Date.now();
  const messageId = `${timestamp}#${crypto.randomUUID()}`;

  const item: AssistantMessage = {
    id: assistantId,
    createdDate: timestamp.toString(),
    messageId,
    assistantId,
    userId,
    role,
    content,
    sources,
    metadata,
  };

  const dynamoDbDocument = await getTenantDynamoDBDocument(event!);
  const tableName = getAssistantMessagesTableName(event!);

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return item;
};

export const listMessages = async (
  _assistantId: string,
  userId: string,
  event: APIGatewayProxyEvent,
  _exclusiveStartKey?: string,
  limit?: number
): Promise<ListAssistantMessagesResponse> => {
  const assistantId = `assistant#${_assistantId}`;
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantMessagesTableName(event);

  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
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
      ScanIndexForward: false,
      Limit: limit || 100,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  return {
    messages: res.Items as AssistantMessage[],
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const deleteMessagesForAssistant = async (
  _assistantId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const assistantId = `assistant#${_assistantId}`;
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getAssistantMessagesTableName(event);

  // Query all messages for the assistant
  let exclusiveStartKey: any = undefined;

  do {
    const res = await dynamoDbDocument.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: '#assistantId = :assistantId',
        ExpressionAttributeNames: {
          '#assistantId': 'assistantId',
        },
        ExpressionAttributeValues: {
          ':assistantId': assistantId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    // Delete each message
    if (res.Items) {
      for (const item of res.Items) {
        await dynamoDbDocument.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              assistantId: item.assistantId,
              messageId: item.messageId,
            },
          })
        );
      }
    }

    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);
};
