import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createShareId, findChatById } from './repository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const chatId = event.pathParameters!.chatId!;

    // 認可チェック：指定されたチャットがユーザーに属しているかを確認
    const chat = await findChatById(userId, chatId);
    if (!chat) {
      console.warn(
        `認可エラー：ユーザー ${userId} が他人のチャット ${chatId} の共有を試みました`
      );
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'このチャットを共有する権限がありません。',
        }),
      };
    }

    const response = await createShareId(userId, chatId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
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
