import * as lambda from 'aws-lambda';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const DATA_SOURCE_BUCKET_NAME = process.env.DATA_SOURCE_BUCKET_NAME!;

// デフォルトだとMODEL_REGIONにs3bucketもできるため、ここではMODEL_REGIONを使用する カスタムしてる環境だと別の環境変数を設定しておく感じになりそう
const MODEL_REGION = process.env.MODEL_REGION;

export const handler = async () // _event: lambda.APIGatewayProxyEvent
: Promise<lambda.APIGatewayProxyResult> => {
  try {
    // リージョンを指定してS3クライアントを初期化
    const s3Client = new S3Client({
      region: MODEL_REGION, // リージョンを指定
    });

    const command = new ListObjectsV2Command({
      Bucket: DATA_SOURCE_BUCKET_NAME,
      Delimiter: '/',
      Prefix: 'docs/',
    });

    const response = await s3Client.send(command);

    const prefixes =
      response.CommonPrefixes?.map((prefix) => prefix.Prefix) || [];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        prefixes: prefixes,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error listing prefixes',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
