import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteChat, deleteShareId, findShareId } from './repository';
import { getUsername } from './utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;
    await deleteChat(userId, chatId, event);

    const shareId = await findShareId(userId, chatId, event);

    if (shareId) {
      await deleteShareId(shareId.shareId.split('#')[1], event);
    }

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
