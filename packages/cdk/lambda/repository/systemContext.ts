import { SystemContext } from 'generative-ai-use-cases';
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

export const findSystemContextById = async (
  _userId: string,
  _systemContextId: string,
  event: APIGatewayProxyEvent
): Promise<SystemContext | null> => {
  const userId = `systemContext#${_userId}`;
  const systemContextId = `systemContext#${_systemContextId}`;

  const res = await executeDynamoDBOperation(
    event,
    async (client, tableName) => {
      return client.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#id = :id',
          FilterExpression: '#systemContextId = :systemContextId',
          ExpressionAttributeNames: {
            '#id': 'id',
            '#systemContextId': 'systemContextId',
          },
          ExpressionAttributeValues: {
            ':id': userId,
            ':systemContextId': systemContextId,
          },
        })
      );
    }
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0] as SystemContext;
  }
};

export const listSystemContexts = async (
  _userId: string,
  event: APIGatewayProxyEvent
): Promise<SystemContext[]> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const userId = `systemContext#${_userId}`;

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
    })
  );

  return res.Items as SystemContext[];
};

export const createSystemContext = async (
  _userId: string,
  title: string,
  systemContext: string,
  event: APIGatewayProxyEvent
): Promise<SystemContext> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const userId = `systemContext#${_userId}`;
  const systemContextId = `systemContext#${crypto.randomUUID()}`;

  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    systemContextId: systemContextId,
    systemContext: systemContext,
    systemContextTitle: title,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return item;
};

export const updateSystemContextTitle = async (
  _userId: string,
  _systemContextId: string,
  title: string,
  event: APIGatewayProxyEvent
): Promise<SystemContext> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const systemContext = await findSystemContextById(
    _userId,
    _systemContextId,
    event
  );

  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        id: systemContext?.id,
        createdDate: systemContext?.createdDate,
      },
      UpdateExpression: 'set systemContextTitle = :systemContextTitle',
      ExpressionAttributeValues: {
        ':systemContextTitle': title,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return res.Attributes as SystemContext;
};

export const deleteSystemContext = async (
  _userId: string,
  _systemContextId: string,
  event: APIGatewayProxyEvent
): Promise<void> => {
  const dynamoDbDocument = await getTenantDynamoDBDocument(event);
  const tableName = getTableName(event);

  const systemContext = await findSystemContextById(
    _userId,
    _systemContextId,
    event
  );

  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        id: systemContext?.id,
        createdDate: systemContext?.createdDate,
      },
    })
  );
};

