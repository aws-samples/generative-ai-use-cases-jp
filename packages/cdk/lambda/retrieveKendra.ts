import * as lambda from 'aws-lambda';
import {
  AttributeFilter,
  KendraClient,
  RetrieveCommand,
} from '@aws-sdk/client-kendra';
import { RetrieveKendraRequest } from 'generative-ai-use-cases-jp';

const INDEX_ID = process.env.INDEX_ID;

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const req = JSON.parse(event.body!) as RetrieveKendraRequest;
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

  // デフォルト言語が英語なので、言語設定は必ず行う
  const attributeFilter: AttributeFilter = {
    AndAllFilters: [
      {
        EqualsTo: {
          Key: '_language_code',
          Value: {
            StringValue: 'ja',
          },
        },
      },
    ],
  };

  const kendra = new KendraClient({});
  const retrieveCommand = new RetrieveCommand({
    IndexId: INDEX_ID,
    QueryText: query,
    AttributeFilter: attributeFilter,
  });

  const retrieveRes = await kendra.send(retrieveCommand);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(retrieveRes),
  };
};
