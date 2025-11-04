import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteSystemContext } from './repository';
import { getUsername } from './utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const systemContextId = event.pathParameters!.systemContextId!;
    await deleteSystemContext(userId, systemContextId, event);

    return {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
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
