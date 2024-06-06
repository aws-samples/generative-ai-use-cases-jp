import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateLambdaFunctionRequest } from 'generative-ai-use-cases-jp';
import {
  UpdateFunctionCodeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import JSZip = require('jszip');

const zip = new JSZip();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: UpdateLambdaFunctionRequest = JSON.parse(event.body!);
    zip.file('index.js', req.code);
    const zipFile = await zip.generateAsync({ type: 'uint8array' });

    const client = new LambdaClient({});
    const command = new UpdateFunctionCodeCommand({
      FunctionName: req.functionName,

      ZipFile: zipFile,
    });

    await client.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({}),
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
