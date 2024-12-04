import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  TranscribeClient,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  GetTranscriptionResponse,
  Transcript,
} from 'generative-ai-use-cases-jp';

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
      const output = JSON.parse(await s3Result.Body!.transformToString());

      // 文字起こしをフォーマット
      const rawTranscripts: Transcript[] = output.results.audio_segments.map(
        (item: { transcript: string; speaker_label?: string }) => ({
          speakerLabel: item.speaker_label,
          transcript: item.transcript,
        })
      );
      // 話者が連続する場合はマージ
      const transcripts = rawTranscripts
        .reduce((prev, item) => {
          if (
            prev.length === 0 ||
            item.speakerLabel !== prev[prev.length - 1].speakerLabel
          ) {
            prev.push({
              speakerLabel: item.speakerLabel,
              transcript: item.transcript,
            });
          } else {
            prev[prev.length - 1].transcript += ' ' + item.transcript;
          }
          return prev;
        }, [] as Transcript[])
        .map((item) => ({
          ...item,
          // フレーズの間にスペースが入るため日本語の場合はスペースを除去
          transcript:
            output.results.language_code === 'ja-JP'
              ? item.transcript.replace(/ /g, '')
              : item.transcript,
        }));

      const response: GetTranscriptionResponse = {
        status: res.TranscriptionJob?.TranscriptionJobStatus,
        languageCode: output.results.language_code,
        transcripts: transcripts,
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
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
