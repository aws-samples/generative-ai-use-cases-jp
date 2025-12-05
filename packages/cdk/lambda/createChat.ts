import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createChat } from './repository';
import { getUsername } from './utils/tenantUtils';
import { ok200Response } from './utils/apiResponse';
import { handleLambdaError } from './utils/errorHandler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUsername(event);
    const chat = await createChat(userId, event);

    return ok200Response({
      chat,
    });
  } catch (error) {
    return handleLambdaError(error);
  }
};
