import { ShareId, UserIdAndChatId } from 'generative-ai-use-cases';
import * as crypto from 'crypto';
import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getTenantDynamoDBDocument, getTableName } from './common';

export const createShareId = async (
  _userId: string,
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<{
  shareId: ShareId;
  userIdAndChatId: UserIdAndChatId;
}> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const userId = `user#${_userId}`;
  const chatId = `chat#${_chatId}`;
  const createdDate = `${Date.now()}`;
  const shareId = `share#${crypto.randomUUID()}`;

  const itemShareId = {
    id: `${userId}_${chatId}`,
    createdDate,
    shareId,
  };

  const itemUserIdAndChatId = {
    id: shareId,
    createdDate,
    userId,
    chatId,
  };

  await dynamoDbDocument.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: itemShareId,
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: itemUserIdAndChatId,
          },
        },
      ],
    })
  );

  return {
    shareId: itemShareId,
    userIdAndChatId: itemUserIdAndChatId,
  };
};

export const findUserIdAndChatId = async (
  _shareId: string,
  event: APIGatewayProxyEvent
): Promise<UserIdAndChatId | null> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const shareId = `share#${_shareId}`;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': shareId,
      },
    })
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0] as UserIdAndChatId;
  }
};

export const findShareId = async (
  _userId: string,
  _chatId: string,
  event: APIGatewayProxyEvent
): Promise<ShareId | null> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const userId = `user#${_userId}`;
  const chatId = `chat#${_chatId}`;

  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': `${userId}_${chatId}`,
      },
    })
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0] as ShareId;
  }
};

export const deleteShareId = async (
  _shareId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const userIdAndChatId = await findUserIdAndChatId(_shareId, event);
  const share = await findShareId(
    // SAML authentication includes # in userId
    userIdAndChatId!.userId.split('#').slice(1).join('#'),
    userIdAndChatId!.chatId.split('#')[1],
    event
  );

  await dynamoDbDocument.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: tableName,
            Key: {
              id: share!.id,
              createdDate: share!.createdDate,
            },
          },
        },
        {
          Delete: {
            TableName: tableName,
            Key: {
              id: userIdAndChatId!.id,
              createdDate: userIdAndChatId!.createdDate,
            },
          },
        },
      ],
    })
  );
};
