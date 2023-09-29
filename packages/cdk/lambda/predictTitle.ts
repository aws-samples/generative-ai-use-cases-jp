import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  PredictTitleRequest,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import { setChatTitle } from './repository';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getClaudeInvokeInput } from './utils/bedrockUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictTitleRequest = JSON.parse(event.body!);

    // タイトル設定用の質問を追加
    const messages: UnrecordedMessage[] = [
      ...req.messages,
      {
        role: 'user',
        content:
          '上記の内容から30文字以内でタイトルを作成してください。かっこなどの表記は不要です。',
      },
    ];

    // 東京リージョンで GA されていないため、us-east-1 を固定指定しています
    const client = new BedrockRuntimeClient({ region: 'us-east-1' });
    const command = new InvokeModelCommand(getClaudeInvokeInput(messages));

    const data = await client.send(command);
    const title = JSON.parse(data.body.transformToString()).completion;
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
