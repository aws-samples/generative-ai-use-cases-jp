import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateMeetingMinutesCustomPromptRequest } from 'generative-ai-use-cases';
import {
  listMeetingMinutesCustomPrompts,
  createMeetingMinutesCustomPrompt,
  updateMeetingMinutesCustomPrompt,
  deleteMeetingMinutesCustomPrompt,
} from './repository';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const method = event.httpMethod;

    if (method === 'GET') {
      const items = await listMeetingMinutesCustomPrompts(userId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(items),
      };
    }

    if (method === 'POST') {
      const req = JSON.parse(event.body!);
      const prompt = await createMeetingMinutesCustomPrompt(
        userId,
        req.meetingMinutesCustomPromptTitle,
        req.meetingMinutesCustomPromptBody
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ meetingMinutesCustomPrompt: prompt }),
      };
    }

    if (method === 'PUT') {
      const id = event.pathParameters!.id!;
      const req: UpdateMeetingMinutesCustomPromptRequest = JSON.parse(
        event.body!
      );
      const prompt = await updateMeetingMinutesCustomPrompt(
        userId,
        id,
        req.meetingMinutesCustomPromptTitle,
        req.meetingMinutesCustomPromptBody
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ meetingMinutesCustomPrompt: prompt }),
      };
    }

    if (method === 'DELETE') {
      const id = event.pathParameters!.id!;
      await deleteMeetingMinutesCustomPrompt(userId, id);
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
