import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Configuration, OpenAIApi } from 'openai';
import {
  PredictTitleRequest,
  UnrecordedMessage,
} from 'generative-ai-use-cases-jp';
import { fetchOpenApiKey } from './secret';
import { setChatTitle } from './repository';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictTitleRequest = JSON.parse(event.body!);

    // Secret 情報の取得
    const apiKey = await fetchOpenApiKey();

    // OpenAI API の初期化
    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    // タイトル設定用の質問を追加
    const messages: UnrecordedMessage[] = [
      ...req.messages,
      {
        role: 'user',
        content:
          '上記の内容から30文字以内でタイトルを作成してください。かっこなどの表記は不要です。',
      },
    ];

    // OpenAI API を使用してタイトルを取得
    const chatCompletion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });

    const title = chatCompletion.data.choices[0].message!.content!;
    await setChatTitle(req.chat.id, req.chat.createdDate, title);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
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
