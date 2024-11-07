import * as lambda from 'aws-lambda';
import { KendraClient, QueryCommand } from '@aws-sdk/client-kendra';
import { QueryKendraRequest } from 'generative-ai-use-cases-jp';

const INDEX_ID = process.env.INDEX_ID;

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const req = JSON.parse(event.body!) as QueryKendraRequest;
  const query = req.query;

  if (!query) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'query is not specified' }),
    };
  }

  const kendra = new KendraClient({});
  const queryCommand = new QueryCommand({
    IndexId: INDEX_ID,
    QueryText: query,
  });

  const queryRes = await kendra.send(queryCommand);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(queryRes),
  };
};
