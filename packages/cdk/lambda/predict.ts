import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PredictRequest } from 'generative-ai-use-cases-jp';
import bedrockApi from './bedrockApi';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: PredictRequest = JSON.parse(event.body!);

    const res = await bedrockApi.invoke(req.messages);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(res.data.completion),
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
