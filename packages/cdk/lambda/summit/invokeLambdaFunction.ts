import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { InvokeLambdaFunctionRequest } from 'generative-ai-use-cases-jp';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: InvokeLambdaFunctionRequest = JSON.parse(event.body!);

    const client = new LambdaClient({});
    const command = new InvokeCommand({
      FunctionName: req.functionName,
      Payload: JSON.stringify(req.payload),
    });

    const res = await client.send(command);

    console.log(req, res);

    return {
      statusCode: res.StatusCode ?? 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(res.Payload ?? []).toString(),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: (error as Error).stack }),
    };
  }
};
