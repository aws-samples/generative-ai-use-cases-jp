import { Chat, ListChatsResponse } from 'generative-ai-use-cases';
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
  getTableName,
  executeDynamoDBOperation,
} from './common';
import { listMessages, deleteMessagesForChat } from './message';

export const createChat = async (
  _userId: string,
  event: APIGatewayProxyEvent
): Promise<Chat> => {
  const userId = `user#${_userId}`;
  const chatId = `chat#${crypto.randomUUID()}`;
  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    chatId,
    usecase: '',
    title: '',
    updatedDate: '',
  };

  await executeDynamoDBOperation(event, async (client, tableName) => {
    return client.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    );
  });

  return item;
};

export const findChatById = async (
  _userId: string,
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<Chat | null> => {
  const userId = `user#${_userId}`;
  const chatId = `chat#${_chatId}`;

  const res = await executeDynamoDBOperation(
    event,
    async (client, tableName) => {
      return client.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#id = :id',
          FilterExpression: '#chatId = :chatId',
          ExpressionAttributeNames: {
            '#id': 'id',
            '#chatId': 'chatId',
          },
          ExpressionAttributeValues: {
            ':id': userId,
            ':chatId': chatId,
          },
        })
      );
    }
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0] as Chat;
  }
};

export const listChats = async (
  _userId: string,
  event: APIGatewayProxyEvent,
  _exclusiveStartKey?: string
): Promise<ListChatsResponse> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;
  const userId = `user#${_userId}`;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': userId,
      },
      ScanIndexForward: false,
      Limit: 100,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  return {
    data: res.Items as Chat[],
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const setChatTitle = async (
  id: string,
  createdDate: string,
  title: string,
  event: APIGatewayProxyEvent
) => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        id: id,
        createdDate: createdDate,
      },
      UpdateExpression: 'set title = :title',
      ExpressionAttributeValues: {
        ':title': title,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return res.Attributes as Chat;
};

export const deleteChat = async (
  _userId: string,
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  // Delete Chat
  const chatItem = await findChatById(_userId, _chatId, event);
  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        id: chatItem?.id,
        createdDate: chatItem?.createdDate,
      },
    })
  );

  // Delete Messages
  await deleteMessagesForChat(_chatId, event);
};
