import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateMessagesRequest, ExtraData } from 'generative-ai-use-cases';
import { batchCreateMessages, findChatById } from './repository';

// URLのスキーマが安全かどうかを検証する関数
const isValidUrlScheme = (url: string): boolean => {
  // 許可するURLスキームのホワイトリスト
  const safeSchemes = ['https://', 'http://', 's3://'];

  // いずれかの安全なスキームで始まる場合は許可
  for (const scheme of safeSchemes) {
    if (url.toLowerCase().startsWith(scheme)) {
      return true;
    }
  }

  // data URIの場合は、メディアタイプを検証
  if (url.toLowerCase().startsWith('data:')) {
    // 許可するメディアタイプのホワイトリスト
    const safeMediaTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/octet-stream',
    ];

    // data:image/png;base64,... のようなパターンをチェック
    const mediaTypeMatch = url.match(/^data:([^;,]+)/i);
    if (mediaTypeMatch && mediaTypeMatch[1]) {
      const mediaType = mediaTypeMatch[1].toLowerCase();
      return safeMediaTypes.includes(mediaType);
    }
  }

  // 上記以外は不許可
  return false;
};

// extraDataの検証関数
const validateExtraData = (extraData: ExtraData[]): boolean => {
  for (const data of extraData) {
    if (data.source && data.source.data) {
      // URLスキームが安全でない場合はfalseを返す
      if (!isValidUrlScheme(data.source.data)) {
        console.warn(
          `安全でないURLスキームが検出されました: ${data.source.data.substring(0, 30)}...`
        );
        return false;
      }
    }
  }
  return true;
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateMessagesRequest = JSON.parse(event.body!);
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const chatId = event.pathParameters!.chatId!;

    // 認可チェック：指定されたチャットがユーザーに属しているかを確認
    const chat = await findChatById(userId, chatId);
    if (!chat) {
      console.warn(
        `認可エラー：ユーザー ${userId} が他人のチャット ${chatId} に投稿を試みました`
      );
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'このチャットにメッセージを投稿する権限がありません。',
        }),
      };
    }

    // メッセージの検証
    if (req.messages) {
      for (const message of req.messages) {
        if (message.extraData && message.extraData.length > 0) {
          // extraDataの検証
          if (!validateExtraData(message.extraData)) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify({
                message:
                  '添付ファイルに安全でないURLが含まれています。許可されるURLスキームは https://, http://, s3:// およびメディアタイプが適切なdata: URLのみです。',
              }),
            };
          }
        }
      }
    }

    const messages = await batchCreateMessages(req.messages, userId, chatId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        messages,
      }),
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
