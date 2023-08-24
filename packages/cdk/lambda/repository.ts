import {
  Chat,
  RecordedMessage,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import * as crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME: string = process.env.TABLE_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

export const createChat = async (_userId: string): Promise<Chat> => {
  const userId = `user#${_userId}`;
  const chatId = `chat#${crypto.randomUUID()}`;
  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    chatId,
    usecase: '',
    title: '仮のタイトルです',
    updatedDate: '',
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
};

export const recordMessage = async (
  unrecordedMessage: UnrecordedMessage,
  userId: string,
  chatId: string
): Promise<RecordedMessage> => {
  const messageId = `message#${crypto.randomUUID()}`;
  const item = {
    id: chatId,
    createdDate: `${Date.now()}#0`,
    messageId,
    userId,
    feedback: 'none',
    usecase: '',
    llmType: 'OpenAI',
    ...unrecordedMessage,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
};
