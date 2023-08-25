import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Configuration, OpenAIApi } from 'openai';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import { fetchOpenApiKey } from './secret';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictRequest = JSON.parse(event.body!);

    // Secret 情報の取得
    const apiKey = await fetchOpenApiKey();

    // OpenAI API の初期化
    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    // OpenAI API を使用してチャットの応答を取得
    const chatCompletion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: req.messages,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
      body: chatCompletion.data.choices[0].message?.content!,
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
