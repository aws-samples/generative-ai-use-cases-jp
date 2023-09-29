import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getClaudeInvokeInput } from './utils/bedrockUtils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictRequest = JSON.parse(event.body!);

    // 東京リージョンで GA されていないため、us-east-1 を固定指定しています
    const client = new BedrockRuntimeClient({ region: 'us-east-1' });
    const command = new InvokeModelCommand(getClaudeInvokeInput(req.messages));

    const data = await client.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: data.body.transformToString(),
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
