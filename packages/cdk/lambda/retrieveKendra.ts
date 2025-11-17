import * as lambda from 'aws-lambda';
import {
  AttributeFilter,
  KendraClient,
  RetrieveCommand,
} from '@aws-sdk/client-kendra';
import { RetrieveKendraRequest } from 'generative-ai-use-cases';
import { badRequest400Response, ok200Response } from './utils/apiResponse';

const INDEX_ID = process.env.INDEX_ID;
const LANGUAGE = process.env.LANGUAGE;

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const req = JSON.parse(event.body!) as RetrieveKendraRequest;
  const query = req.query;

  if (!query) {
    // TODO: パラメータが他と違うのでとりあえず両方セットしておく
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
  const retrieveCommand = new RetrieveCommand({
    IndexId: INDEX_ID,
    QueryText: query,
    AttributeFilter: attributeFilter,
  });

  const retrieveRes = await kendra.send(retrieveCommand);

  return ok200Response(retrieveRes);
};
