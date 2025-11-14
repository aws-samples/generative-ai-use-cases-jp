import {
  Chat,
  ListChatsResponse,
  AssistantMessage,
  AssistantMessageSource,
  ListAssistantMessagesResponse,
} from 'generative-ai-use-cases';
import * as crypto from 'crypto';
import {
  BatchWriteCommand,
  DeleteCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandOutput,
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

export const createAssistantChat = async (
  _userId: string,
  _assistantId: string,
  _chatId: string,
  assistantName: string,
  event: APIGatewayProxyEvent
): Promise<Chat> => {
  const userId = `user#${_userId}`;
  const assistantId = `assistant#${_assistantId}`;
  const chatId = _chatId.startsWith('chat#') ? _chatId : `chat#${_chatId}`;
  const timestamp = Date.now();

  const item: Chat = {
    id: userId,
    createdDate: `${timestamp}`,
    chatId: chatId,
    usecase: '/assistant',
    title: assistantName,
    updatedDate: `${timestamp}`,
    conversationType: 'assistant',
    assistantId: assistantId,
    assistantName: assistantName,
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

export const updateChatUpdatedDate = async (
  id: string,
  createdDate: string,
  event: APIGatewayProxyEvent
) => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const timestamp = Date.now();
  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        id: id,
        createdDate: createdDate,
      },
      UpdateExpression: 'set updatedDate = :updatedDate',
      ExpressionAttributeValues: {
        ':updatedDate': `${timestamp}`,
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

export const createAssistantMessage = async (
  _chatId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  sources?: AssistantMessageSource[],
  metadata?: AssistantMessage['metadata'],
  event?: APIGatewayProxyEvent
): Promise<AssistantMessage> => {
  const chatId = _chatId.startsWith('chat#') ? _chatId : `chat#${_chatId}`;
  const timestamp = Date.now();
  const messageId = `${timestamp}#${crypto.randomUUID()}`;

  const item: AssistantMessage = {
    id: chatId,
    createdDate: messageId,
    messageId,
    assistantId: '',
    chatId,
    userId,
    role,
    content,
    sources,
    metadata,
  };

  const dynamoDbDocument = await getTenantDynamoDBDocument(event!);
  const tableName = getTableName(event!);

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return item;
};

export const listAssistantMessages = async (
  userId: string,
  _chatId: string,
  event: APIGatewayProxyEvent,
  _exclusiveStartKey?: string,
  limit?: number
): Promise<ListAssistantMessagesResponse> => {
  const chatId = _chatId.startsWith('chat#') ? _chatId : `chat#${_chatId}`;
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const queryParams: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: '#id = :id',
    FilterExpression: '#userId = :userId',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#userId': 'userId',
    },
    ExpressionAttributeValues: {
      ':id': chatId,
      ':userId': userId,
    },
    ScanIndexForward: true,
    Limit: limit || 100,
    ExclusiveStartKey: exclusiveStartKey,
  };

  const res = await dynamoDbDocument.send(new QueryCommand(queryParams));

  return {
    messages: res.Items as AssistantMessage[],
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const deleteAssistantMessagesForChat = async (
  chatId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  let allItems: AssistantMessage[] = [];
  let exclusiveStartKey: Record<string, string> | undefined = undefined;

  // Paginate through all messages
  do {
    const res: QueryCommandOutput = await dynamoDbDocument.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#id': 'id',
        },
        ExpressionAttributeValues: {
          ':id': chatId,
        },
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    if (res.Items && res.Items.length > 0) {
      allItems = allItems.concat(res.Items as AssistantMessage[]);
    }

    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  // Delete in batches of 25 (DynamoDB BatchWrite limit)
  if (allItems.length > 0) {
    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < allItems.length; i += batchSize) {
      batches.push(allItems.slice(i, i + batchSize));
    }

    // Execute all batch deletes
    const batchPromises = batches.map((batch) =>
      dynamoDbDocument.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: batch.map((item) => ({
              DeleteRequest: {
                Key: {
                  id: item.id,
                  createdDate: item.createdDate,
                },
              },
            })),
          },
        })
      )
    );

    await Promise.all(batchPromises);
  }
};

export const deleteAllMessagesForAssistant = async (
  _assistantId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const assistantId = `assistant#${_assistantId}`;
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  // Find all chats for this assistant by scanning for conversations with matching assistantId
  // Since we're querying by userId (id), we need to find all users who have chats with this assistant
  // This is a limitation of the single-table design - we'll need to scan with filter
  let chats: Chat[] = [];
  let lastEvaluatedKey: Record<string, string> | undefined = undefined;

  do {
    const scanResult: ScanCommandOutput = await dynamoDbDocument.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression:
          '#assistantId = :assistantId AND attribute_exists(chatId)',
        ExpressionAttributeNames: {
          '#assistantId': 'assistantId',
        },
        ExpressionAttributeValues: {
          ':assistantId': assistantId,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (scanResult.Items) {
      chats = chats.concat(scanResult.Items as Chat[]);
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  // Delete messages for each chat
  for (const chat of chats) {
    // chat.chatId already has the 'chat#' prefix from the database
    await deleteAssistantMessagesForChat(chat.chatId, event);
  }
};
