import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createChat } from './repository';

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const chat = await createChat(userId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      },
      body: JSON.stringify({
        chat,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
