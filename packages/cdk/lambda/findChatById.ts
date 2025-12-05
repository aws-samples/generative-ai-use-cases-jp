import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findChatById } from './repository';
import { getUsername } from './utils/tenantUtils';
import { ok200Response } from './utils/apiResponse';
import { handleLambdaError } from './utils/errorHandler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;
    const chat = await findChatById(userId, chatId, event);

    return ok200Response({
      chat,
    });
  } catch (error) {
    return handleLambdaError(error);
  }
};
