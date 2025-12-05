import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateTitleRequest } from 'generative-ai-use-cases';
import { findChatById, setChatTitle } from './repository';
import { getUsername } from './utils/tenantUtils';
import { notFound404Response, ok200Response } from './utils/apiResponse';
import { handleLambdaError } from './utils/errorHandler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;
    const req: UpdateTitleRequest = JSON.parse(event.body!);

    const chatItem = await findChatById(userId, chatId, event);

    if (!chatItem) {
      return notFound404Response();
    }

    const updatedChat = await setChatTitle(
      chatItem?.id,
      chatItem?.createdDate,
      req.title,
      event
    );

    return ok200Response({ chat: updatedChat });
  } catch (error) {
    return handleLambdaError(error);
  }
};
