import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSystemContext } from './repository';
import { SystemContext } from 'generative-ai-use-cases';
import { getUsername } from './utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: SystemContext = JSON.parse(event.body!);
    const userId = getUsername(event);
    const messages = await createSystemContext(
      userId,
      req.systemContextTitle,
      req.systemContext,
      event
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
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
