import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { findUserIdAndChatId, findChatById, listMessages } from './repository';
import {
  internalServerError500Response,
  notFound404Response,
  ok200Response,
} from './utils/apiResponse';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const shareId = event.pathParameters!.shareId!;
    const res = await findUserIdAndChatId(shareId, event);

    if (res === null) {
      return notFound404Response();
    }

    const userId = res.userId;
    const chatId = res.chatId;

    const chat = await findChatById(
      // SAML authentication includes # in userId
      // Example: user#EntraID_hogehoge.com#EXT#@hogehoge.onmicrosoft.com
      userId.split('#').slice(1).join('#'),
      chatId.split('#')[1],
      event
    );
    const messages = await listMessages(chatId.split('#')[1], event);

    return ok200Response({
      chat,
      messages,
    });
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
