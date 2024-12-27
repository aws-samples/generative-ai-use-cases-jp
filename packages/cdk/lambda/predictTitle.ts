import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  PredictTitleRequest,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import { setChatTitle } from './repository';
import api from './utils/api';
import { defaultModel } from './utils/models';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new Error('Request body is missing');
    }

    const req = JSON.parse(event.body) as PredictTitleRequest;

    // Validation
    if (!req.prompt || !req.chat?.id || !req.chat?.createdDate || !req.id) {
      throw new Error('Invalid request format');
    }

    // title 生成は軽量なデフォルトモデルを利用する
    const model = defaultModel;

    // タイトル設定用の質問を追加
    const messages: UnrecordedMessage[] = [
      {
        role: 'user',
        content: req.prompt,
      },
    ];

    // 新規モデル追加時は、デフォルトで Claude の prompter が利用されるため
    // 出力が <output></output> で囲まれる可能性がある
    // 以下の処理ではそれに対応するため、<output></output> を含む xml タグを削除している
    const title =
      (await api['bedrock'].invoke?.(model, messages, req.id))?.replace(
        /<([^>]+)>([\s\S]*?)<\/\1>/,
        '$2'
      ) ?? '';

    await setChatTitle(req.chat.id, req.chat.createdDate, title);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: title,
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
