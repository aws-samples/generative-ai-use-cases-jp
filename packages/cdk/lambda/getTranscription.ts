import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  TranscribeClient,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetTranscriptionResponse, Transcript } from 'generative-ai-use-cases';
import { getTenantId } from './utils/tenantUtils';
import { getTenantCredentials } from './utils/tenantCredentials';
import { createTenantS3Client } from './utils/tenantS3Client';
import { isDefaultTenant } from './utils/tenantS3Utils';

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
    const jobName = event.pathParameters!.jobName;
    const userId = event.requestContext.authorizer!.claims.sub;
    const tenantId = getTenantId(event);

    console.log(
      `Getting transcription for tenant: ${tenantId}, user: ${userId}, job: ${jobName}`
    );

    // Get tenant-specific clients
    const { transcribeClient, s3Client } = await (async () => {
      if (isDefaultTenant(tenantId)) {
        return {
          transcribeClient: new TranscribeClient({}),
          s3Client: new S3Client({}),
        };
      }

      console.log(`Creating tenant-specific clients for tenant: ${tenantId}`);

      // Use existing utility for tenant S3 client creation
      const s3Client = await createTenantS3Client(event);

      // Get tenant credentials for Transcribe client
      const { credentials, tenant } = await getTenantCredentials(event);

      return {
        transcribeClient: new TranscribeClient({
          credentials: {
            accessKeyId: credentials.AccessKeyId!,
            secretAccessKey: credentials.SecretAccessKey!,
            sessionToken: credentials.SessionToken,
          },
          region: tenant.region,
        }),
        s3Client,
      };
    })();

    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });
    const res = await transcribeClient.send(command);

    // With AssumeRoleWithWebIdentity and IAM policies, access control is handled automatically
    // If this code executes, the user has permission to access this transcription job
    // The tenant isolation is enforced by IAM policies, not application-level checks

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

      // Format the transcription
      const rawTranscripts: Transcript[] = output.results.audio_segments.map(
        (item: { transcript: string; speaker_label?: string }) => ({
          speakerLabel: item.speaker_label,
          transcript: item.transcript,
        })
      );
      // If the speaker is continuous, merge them
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
          // There is a space between phrases, so remove it for Japanese
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
