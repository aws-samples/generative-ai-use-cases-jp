import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteChat, deleteShareId, findShareId } from './repository';
import { getUsername } from './utils/tenantUtils';
import { noContent204Response } from './utils/apiResponse';
import { handleLambdaError } from './utils/errorHandler';

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

    return noContent204Response();
  } catch (error) {
    return handleLambdaError(error);
  }
};
