import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findChatById, listMessages } from './repository';
import { getUsername } from './utils/tenantUtils';
import { notFound404Response, ok200Response } from './utils/apiResponse';
import { handleLambdaError } from './utils/errorHandler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;
    const chat = await findChatById(userId, chatId, event);

    if (chat === null) {
      return notFound404Response({ message: 'Chat not found' });
    }

    const messages = await listMessages(chatId, event);

    return ok200Response({
      messages,
    });
  } catch (error) {
    return handleLambdaError(error);
  }
};
