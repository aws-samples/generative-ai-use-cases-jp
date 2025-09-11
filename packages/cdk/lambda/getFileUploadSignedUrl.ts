import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetFileUploadSignedUrlRequest } from 'generative-ai-use-cases';
import { getTenantId } from './utils/tenantUtils';
import { createTenantS3Client } from './utils/tenantS3Client';
import { getTenant } from './tenantManager';
import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
  extractAccountIdFromRoleArn,
} from './utils/tenantS3Utils';

// Constants
const DEFAULT_BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: GetFileUploadSignedUrlRequest = JSON.parse(event.body!);
    const filename = req.filename;
    const uuid = uuidv4();

    // Extract tenant ID from Cognito authorizer claims
    const tenantId = getTenantId(event);
    console.log(`Processing file upload for tenant: ${tenantId}`);
    console.log(`Request filename: ${filename}`);

    // Get tenant information for proper bucket name generation
    const { tenantAccountId, tenantRegion, tenantEnvironment } = !isDefaultTenant(tenantId) ? await (async () => {
      try {
        const tenant = await getTenant(tenantId);
        if (!tenant?.roleArn) {
          throw new Error(`Tenant ${tenantId} missing role ARN`);
        }
        
        const accountId = extractAccountIdFromRoleArn(tenant.roleArn);
        if (!accountId || !tenant.region || !tenant.environment) {
          throw new Error(`Incomplete tenant information for ${tenantId}: accountId=${accountId}, region=${tenant.region}, environment=${tenant.environment}`);
        }
        
        console.log(`Tenant info - Account: ${accountId}, Region: ${tenant.region}, Environment: ${tenant.environment}`);
        return { 
          tenantAccountId: accountId, 
          tenantRegion: tenant.region, 
          tenantEnvironment: tenant.environment 
        };
      } catch (error) {
        console.error(`Failed to get tenant info for ${tenantId}:`, error);
        throw new Error(`Cannot generate bucket name without tenant information: ${error}`);
      }
    })() : { tenantAccountId: undefined, tenantRegion: undefined, tenantEnvironment: undefined };

    // Get appropriate bucket name (tenant-specific or fallback)
    const bucketName = isDefaultTenant(tenantId) 
      ? DEFAULT_BUCKET_NAME 
      : await getTenantBucketNameByTenantId(
          tenantId,
          'chat',
          DEFAULT_BUCKET_NAME,
          tenantAccountId!,
          tenantRegion!,
          tenantEnvironment!
        );
    console.log(`Using bucket for upload operation: ${bucketName}`);

    // Use tenant-specific S3 client and bucket
    const s3Client: S3Client = isDefaultTenant(tenantId) 
      ? (() => {
          console.log('Using default S3 client for default tenant');
          return new S3Client({});
        })()
      : await (() => {
          console.log('Creating tenant-specific S3 client for signed URL generation');
          return createTenantS3Client(event);
        })();

    // The upload destination is XXXXX/image.png format. The file can be downloaded with the correct file name when downloaded.
    console.log(
      `Final upload destination - Bucket: ${bucketName}, Key: ${uuid}/${filename}`
    );
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${uuid}/${filename}`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    console.log(`Generated signed URL for bucket: ${bucketName}`);

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
