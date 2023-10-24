import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSignedUrlRequest } from 'generative-ai-use-cases-jp';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: GetSignedUrlRequest = JSON.parse(event.body!);
    const mediaFormat = req.mediaFormat;
    const currentDateString = new Date()
      .toISOString()
      .replace(/[:T-]/g, '')
      .split('.')[0];

    const client = new S3Client({});
    const command = new PutObjectCommand({
      Bucket: process.env.AUDIO_BUCKET_NAME,
      Key: `${currentDateString}.${mediaFormat}`,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: signedUrl,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
