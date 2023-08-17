import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Configuration, OpenAIApi } from 'openai';

const SECRET_ARN: string = process.env.SECRET_ARN!;
const client = new SecretsManagerClient({});
let secret: string;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const messages = JSON.parse(event.body!).messages;

    // Secret 情報の取得
    const secretData = await client.send(
      new GetSecretValueCommand({ SecretId: SECRET_ARN })
    );
    secret = secretData.SecretString!;

    // OpenAI API の初期化
    const configuration = new Configuration({
      apiKey: secret,
    });
    const openai = new OpenAIApi(configuration);

    // OpenAI API を使用してチャットの応答を取得
    const chatCompletion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        response: chatCompletion.data.choices[0].message?.content,
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
