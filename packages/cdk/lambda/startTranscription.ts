import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  LanguageCode,
} from '@aws-sdk/client-transcribe';
import { StartTranscriptionRequest } from 'generative-ai-use-cases';
import { getTenantId } from './utils/tenantUtils';
import { getTenantCredentials } from './utils/tenantCredentials';
import { getTenant } from './tenantManager';
import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
  extractAccountIdFromRoleArn,
} from './utils/tenantS3Utils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: StartTranscriptionRequest = JSON.parse(event.body!);
    const userId = event.requestContext.authorizer!.claims.sub;
    const tenantId = getTenantId(event);

    console.log(
      `Starting transcription for tenant: ${tenantId}, user: ${userId}`
    );

    const { audioUrl, speakerLabel, maxSpeakers, languageCode } = req;
    const uuid = uuidv4();

    // Get tenant-specific clients and bucket name
    const { transcribeClient, outputBucketName } = await (async () => {
      if (isDefaultTenant(tenantId)) {
        return {
          transcribeClient: new TranscribeClient({}),
          outputBucketName: process.env.TRANSCRIPT_BUCKET_NAME!,
        };
      }

      console.log(
        `Creating tenant-specific Transcribe client for tenant: ${tenantId}`
      );

      // Get tenant info for bucket name generation
      const tenant = await getTenant(tenantId);
      if (!tenant?.roleArn) {
        throw new Error(`Tenant ${tenantId} missing role ARN`);
      }

      const tenantAccountId = extractAccountIdFromRoleArn(tenant.roleArn);
      if (!tenantAccountId || !tenant.region || !tenant.environment) {
        throw new Error(
          `Incomplete tenant information for ${tenantId}: accountId=${tenantAccountId}, region=${tenant.region}, environment=${tenant.environment}`
        );
      }

      // Generate tenant-specific transcript bucket name
      const tenantBucketName = await getTenantBucketNameByTenantId(
        tenantId,
        'transcripts',
        process.env.TRANSCRIPT_BUCKET_NAME!,
        tenantAccountId,
        tenant.region,
        tenant.environment
      );

      console.log(`Using tenant transcript bucket: ${tenantBucketName}`);

      // Get tenant credentials for AWS service access
      const { credentials } = await getTenantCredentials(event);

      return {
        transcribeClient: new TranscribeClient({
          credentials: {
            accessKeyId: credentials.AccessKeyId!,
            secretAccessKey: credentials.SecretAccessKey!,
            sessionToken: credentials.SessionToken,
          },
          region: tenant.region,
        }),
        outputBucketName: tenantBucketName,
      };
    })();

    const command = new StartTranscriptionJobCommand({
      IdentifyLanguage: !languageCode, // Enable auto-detection when no language specified
      LanguageCode: languageCode ? (languageCode as LanguageCode) : undefined, // Use specified language when provided
      LanguageOptions: !languageCode ? ['ja-JP', 'en-US'] : undefined, // Language candidates for auto-detection only
      Media: { MediaFileUri: audioUrl },
      TranscriptionJobName: uuid,
      Settings: {
        ShowSpeakerLabels: speakerLabel,
        MaxSpeakerLabels: speakerLabel ? maxSpeakers : undefined,
      },
      OutputBucketName: outputBucketName,
      Tags: [
        {
          Key: 'userId',
          Value: userId,
        },
        {
          Key: 'tenantId',
          Value: tenantId,
        },
      ],
    });
    const res = await transcribeClient.send(command);

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
