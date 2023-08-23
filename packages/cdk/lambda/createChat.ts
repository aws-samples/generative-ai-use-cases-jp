import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateChatRequest, RecordedMessage } from 'generative-ai-use-cases-jp';
import { createChat, recordMessage } from './repository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateChatRequest = JSON.parse(event.body!);
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const chat = await createChat(userId);
    const messages: RecordedMessage[] = [];

    for (const m of req.unrecordedMessages) {
      messages.push(await recordMessage(m, userId, chat.chatId));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        chat,
        messages,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
