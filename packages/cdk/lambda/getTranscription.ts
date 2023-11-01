import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  TranscribeClient,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

function parseS3Url(s3Url: string) {
  const url = new URL(s3Url);

  const pathParts = url.pathname.split('/');
  const bucket = pathParts[1];
  const key = pathParts.slice(2).join('/');

  return { bucket, key };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const transcribeClient = new TranscribeClient({});
    const s3Client = new S3Client({});
    const jobName = event.pathParameters!.jobName;
    const userId = event.requestContext.authorizer!.claims.sub;

    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });
    const res = await transcribeClient.send(command);

    if (
      // job を start した時のユーザーと異なる場合は Forbidden エラーを返却
      res.TranscriptionJob?.Tags!.find(
        (tag) => tag.Key === 'userId' && tag.Value !== userId
      )
    ) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Forbidden' }),
      };
    }

    if (res.TranscriptionJob?.TranscriptionJobStatus === 'COMPLETED') {
      const { bucket, key } = parseS3Url(
        res.TranscriptionJob.Transcript!.TranscriptFileUri!
      );
      const s3Result = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      const transcript = JSON.parse(await s3Result.Body!.transformToString());

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          status: res.TranscriptionJob?.TranscriptionJobStatus,
          transcript: transcript.results.transcripts
            .map((item: { transcript: string }) => item.transcript)
            .join(''),
        }),
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          status: res.TranscriptionJob?.TranscriptionJobStatus,
        }),
      };
    }
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
