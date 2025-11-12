import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteShareId, findUserIdAndChatId } from './repository';
import { getUsername } from './utils/tenantUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const shareId = event.pathParameters!.shareId!;

    // Authorization check: Verify ownership of the shared chat
    const userIdAndChatId = await findUserIdAndChatId(shareId, event);

    if (!userIdAndChatId) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Share not found' }),
      };
    }

    // Get current user ID
    const currentUserId = getUsername(event);

    // Extract owner user ID (SAML authentication includes # in userId)
    const ownerUserId = userIdAndChatId.userId.split('#').slice(1).join('#');

    // Ownership check
    if (ownerUserId !== currentUserId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Forbidden: You do not own this resource',
        }),
      };
    }

    // If ownership is verified, proceed with deletion
    await deleteShareId(shareId, event);

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
