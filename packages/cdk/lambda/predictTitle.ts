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
    const req: PredictTitleRequest = JSON.parse(event.body!);

    // model.type が bedrockAgent の場合は title が生成できないため bedrock のデフォルトモデルを使う
    const model =
      req.model.type === 'bedrockAgent'
        ? defaultModel
        : req.model || defaultModel;

    // タイトル設定用の質問を追加
    const messages: UnrecordedMessage[] = [
      {
        role: 'user',
        content: req.prompt,
      },
    ];

    const title = await api[model.type].invoke(model, messages);

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
