import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createShareId, findChatById } from './repository';
import { getUsername } from './utils/tenantUtils';
import {
  forbidden403Response,
  internalServerError500Response,
  ok200Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;

    // Authorization check: Verify if the specified chat belongs to the user
    const chat = await findChatById(userId, chatId, event);
    if (chat === null) {
      return forbidden403Response({
        message: 'You do not have permission to share this chat.',
      });
    }

    const response = await createShareId(userId, chatId, event);

    return ok200Response(response);
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
