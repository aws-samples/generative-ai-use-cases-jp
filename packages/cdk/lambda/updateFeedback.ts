import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateFeedbackRequest } from 'generative-ai-use-cases';
import { listMessages, updateFeedback } from './repository';
import { getUsername } from './utils/tenantUtils';
import { forbidden403Response, ok200Response } from './utils/apiResponse';
import { handleLambdaError } from './utils/errorHandler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const chatId = event.pathParameters!.chatId!;
    const req: UpdateFeedbackRequest = JSON.parse(event.body!);
    const userId = getUsername(event);

    // Authorization check: verify that this message belongs to the user's chat
    const messages = await listMessages(chatId, event);

    // Find a message that matches the createdDate (message ID) in the request
    const targetMessage = messages.find(
      (m) => m.createdDate === req.createdDate
    );

    // Return 403 if the message doesn't exist or doesn't belong to the user
    if (!targetMessage || targetMessage.userId !== `user#${userId}`) {
      console.warn(
        `Authorization error: User ${userId} attempted to provide feedback on message ${req.createdDate} in chat ${chatId} belonging to another user`
      );
      return forbidden403Response({
        message:
          'You do not have permission to provide feedback on this message.',
      });
    }

    const message = await updateFeedback(chatId, req, event);

    return ok200Response({ message });
  } catch (error) {
    return handleLambdaError(error);
  }
};
