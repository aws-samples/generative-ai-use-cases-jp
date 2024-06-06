import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const functionName = event.pathParameters!.functionName!;
    const client = new LambdaClient({});
    const command = new GetFunctionCommand({
      FunctionName: functionName,
    });

    let lambdaArn: string = '';
    try {
      const res = await client.send(command);
      lambdaArn = res.Configuration?.FunctionArn ?? '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e.$metadata.httpStatusCode !== 404) {
        throw e;
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: lambdaArn,
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
