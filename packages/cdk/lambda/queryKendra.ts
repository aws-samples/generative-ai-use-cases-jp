import * as lambda from 'aws-lambda';
import {
  AttributeFilter,
  KendraClient,
  QueryCommand,
} from '@aws-sdk/client-kendra';
import { QueryKendraRequest } from 'generative-ai-use-cases';
import { badRequest400Response, ok200Response } from './utils/apiResponse';

const INDEX_ID = process.env.INDEX_ID;
const LANGUAGE = process.env.LANGUAGE;

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const req = JSON.parse(event.body!) as QueryKendraRequest;
  const query = req.query;

  if (!query) {
    return badRequest400Response({
      message: 'query is not specified',
      error: 'query is not specified',
    });
  }

  // The default language is English, so language settings must be done.
  const attributeFilter: AttributeFilter = {
    AndAllFilters: [
      {
        EqualsTo: {
          Key: '_language_code',
          Value: {
            StringValue: LANGUAGE,
          },
        },
      },
    ],
  };

  const kendra = new KendraClient({});
  const queryCommand = new QueryCommand({
    IndexId: INDEX_ID,
    QueryText: query,
    AttributeFilter: attributeFilter,
  });

  const queryRes = await kendra.send(queryCommand);

  return ok200Response(queryRes);
};
