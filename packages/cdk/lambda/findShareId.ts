import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findShareId } from './repository';
import { getUsername } from './utils/tenantUtils';
import {
  internalServerError500Response,
  noContent204Response,
  ok200Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;
    const res = await findShareId(userId, chatId, event);

    if (res === null) {
      return noContent204Response();
    }

    return ok200Response(res);
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
