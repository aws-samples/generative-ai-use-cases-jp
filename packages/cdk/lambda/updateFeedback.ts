import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RecordedMessage, UpdateFeedbackRequest } from 'generative-ai-use-cases';
import { listMessages, updateFeedback } from './repository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const chatId = event.pathParameters!.chatId!;
    const req: UpdateFeedbackRequest = JSON.parse(event.body!);
    const userId: string = 
      event.requestContext.authorizer!.claims['cognito:username'];
    
    // 認可チェック：このメッセージがユーザーのチャットに属しているかを確認
    const messages = await listMessages(chatId);
    
    // リクエストのcreatedDate（メッセージID）に一致するメッセージを検索
    const targetMessage = messages.find(m => m.createdDate === req.createdDate);
    
    // メッセージが存在しないか、そのユーザーのものでない場合は403を返す
    if (!targetMessage || targetMessage.userId !== `user#${userId}`) {
      console.warn(`認可エラー：ユーザー ${userId} が他人のチャット ${chatId} のメッセージ ${req.createdDate} にフィードバックを試みました`);
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'このメッセージにフィードバックする権限がありません。'
        }),
      };
    }

    const message = await updateFeedback(chatId, req);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message }),
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
