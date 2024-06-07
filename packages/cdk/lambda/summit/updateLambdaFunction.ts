import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateLambdaFunctionRequest } from 'generative-ai-use-cases-jp';
import {
  DeleteFunctionCommand,
  CreateFunctionCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import JSZip = require('jszip');

const zip = new JSZip();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: UpdateLambdaFunctionRequest = JSON.parse(event.body!);
    const setZipFileName = (runtime: string): string => {
      if (runtime.startsWith('nodejs')) {
        return 'index.js';
      } else if (runtime.startsWith('python')) {
        return 'index.py';
      } else {
        throw new Error('Unknown Runtime.');
      }
    };
    const zipFileName = setZipFileName(req.runtime);
    zip.file(zipFileName, req.code);
    const zipFile = await zip.generateAsync({ type: 'uint8array' });

    const client = new LambdaClient({});

    // ロールやランタイムを変更する場合があるので、再作成する
    await client.send(
      new DeleteFunctionCommand({
        FunctionName: req.functionName,
      })
    );

    await client.send(
      new CreateFunctionCommand({
        FunctionName: req.functionName,
        Code: {
          ZipFile: zipFile,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Runtime: req.runtime as any,
        Role: req.role,
        Handler: 'index.handler',
        Timeout: 10,
      })
    );

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
