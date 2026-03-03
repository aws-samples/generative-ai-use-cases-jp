import { MeetingMinutesCustomPrompt } from 'generative-ai-use-cases';
import { v7 as uuidv7 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME: string = process.env.TABLE_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

export const findMeetingMinutesCustomPromptById = async (
  _userId: string,
  _meetingMinutesCustomPromptId: string
): Promise<MeetingMinutesCustomPrompt | null> => {
  const userId = `meetingMinutesCustomPrompt#${_userId}`;
  const meetingMinutesCustomPromptId = `meetingMinutesCustomPrompt#${_meetingMinutesCustomPromptId}`;
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      FilterExpression:
        '#meetingMinutesCustomPromptId = :meetingMinutesCustomPromptId',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#meetingMinutesCustomPromptId': 'meetingMinutesCustomPromptId',
      },
      ExpressionAttributeValues: {
        ':id': userId,
        ':meetingMinutesCustomPromptId': meetingMinutesCustomPromptId,
      },
    })
  );

  if (!res.Items || res.Items.length === 0) {
    return null;
  } else {
    return res.Items[0] as MeetingMinutesCustomPrompt;
  }
};

export const listMeetingMinutesCustomPrompts = async (
  _userId: string
): Promise<MeetingMinutesCustomPrompt[]> => {
  const userId = `meetingMinutesCustomPrompt#${_userId}`;
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
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
  return res.Items as MeetingMinutesCustomPrompt[];
};

export const createMeetingMinutesCustomPrompt = async (
  _userId: string,
  title: string,
  body: string
): Promise<MeetingMinutesCustomPrompt> => {
  const userId = `meetingMinutesCustomPrompt#${_userId}`;
  const meetingMinutesCustomPromptId = `meetingMinutesCustomPrompt#${uuidv7()}`;
  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    meetingMinutesCustomPromptId: meetingMinutesCustomPromptId,
    meetingMinutesCustomPromptTitle: title,
    meetingMinutesCustomPromptBody: body,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
};

export const updateMeetingMinutesCustomPrompt = async (
  _userId: string,
  _meetingMinutesCustomPromptId: string,
  title: string,
  body: string
): Promise<MeetingMinutesCustomPrompt> => {
  const prompt = await findMeetingMinutesCustomPromptById(
    _userId,
    _meetingMinutesCustomPromptId
  );
  const res = await dynamoDbDocument.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        id: prompt?.id,
        createdDate: prompt?.createdDate,
      },
      UpdateExpression:
        'set meetingMinutesCustomPromptTitle = :title, meetingMinutesCustomPromptBody = :body',
      ExpressionAttributeValues: {
        ':title': title,
        ':body': body,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return res.Attributes as MeetingMinutesCustomPrompt;
};

export const deleteMeetingMinutesCustomPrompt = async (
  _userId: string,
  _meetingMinutesCustomPromptId: string
): Promise<void> => {
  const prompt = await findMeetingMinutesCustomPromptById(
    _userId,
    _meetingMinutesCustomPromptId
  );
  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        id: prompt?.id,
        createdDate: prompt?.createdDate,
      },
    })
  );
};
