import * as lambda from 'aws-lambda';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { RetrieveKnowledgeBaseRequest } from 'generative-ai-use-cases-jp';

const DATA_SOURCE_BUCKET_NAME = process.env.DATA_SOURCE_BUCKET_NAME!;
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_REGION = process.env.MODEL_REGION;

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  // [変更点1] リクエストからs3datasourceも取り出すように変更
  const req = JSON.parse(event.body!) as RetrieveKnowledgeBaseRequest;
  const { query, s3datasource } = req;

  // プレフィックスがある場合、S3 URI形式に変換
  const s3datasourceUri = s3datasource
    ? `s3://${DATA_SOURCE_BUCKET_NAME}/${s3datasource}`
    : undefined;

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

  const kb = new BedrockAgentRuntimeClient({
    region: MODEL_REGION,
  });

  // [変更点2] RetrieveCommandの設定を変更
  const retrieveCommand = new RetrieveCommand({
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: query,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: 10,
        overrideSearchType: 'HYBRID',
        ...(s3datasource && {
          filter: {
            startsWith: {
              // x-amz-bedrock-kb-source-uriは、Knowledge Base内のドキュメントのS3パスを示すメタデータ
              key: 'x-amz-bedrock-kb-source-uri',
              // 指定されたS3パスで始まるドキュメントのみを検索対象とする
              value: s3datasourceUri,
            },
          },
        }),
      },
    },
  });

  const retrieveRes = await kb.send(retrieveCommand);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(retrieveRes),
  };
};
