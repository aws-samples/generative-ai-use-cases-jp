import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { StartTranscriptionRequest } from 'generative-ai-use-cases-jp';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const client = new TranscribeClient({});
    const req: StartTranscriptionRequest = JSON.parse(event.body!);
    const { audioUrl, mediaFormat } = req;

    const currentDateString = new Date()
      .toISOString()
      .replace(/[:T-]/g, '')
      .split('.')[0];

    const command = new StartTranscriptionJobCommand({
      IdentifyLanguage: true,
      LanguageOptions: ['ja-JP', 'en-US'],
      MediaFormat: mediaFormat,
      Media: { MediaFileUri: audioUrl },
      TranscriptionJobName: `job-${currentDateString}`,
      OutputBucketName: process.env.TRANSCRIPT_BUCKET_NAME,
    });
    const res = await client.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        jobName: res.TranscriptionJob!.TranscriptionJobName,
      }),
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
