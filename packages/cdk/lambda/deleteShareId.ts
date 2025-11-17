import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteShareId, findUserIdAndChatId } from './repository';
import { getUsername } from './utils/tenantUtils';
import {
  forbidden403Response,
  internalServerError500Response,
  noContent204Response,
  notFound404Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const shareId = event.pathParameters!.shareId!;

    // Authorization check: Verify ownership of the shared chat
    const userIdAndChatId = await findUserIdAndChatId(shareId, event);

    if (!userIdAndChatId) {
      return notFound404Response({ message: 'Share not found' });
    }

    // Get current user ID
    const currentUserId = getUsername(event);

    // Extract owner user ID (SAML authentication includes # in userId)
    const ownerUserId = userIdAndChatId.userId.split('#').slice(1).join('#');

    // Ownership check
    if (ownerUserId !== currentUserId) {
      return forbidden403Response({
        message: 'Forbidden: You do not own this resource',
      });
    }

    // If ownership is verified, proceed with deletion
    await deleteShareId(shareId, event);

    return noContent204Response();
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
