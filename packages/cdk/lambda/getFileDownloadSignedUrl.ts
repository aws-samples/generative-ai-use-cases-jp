import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetFileDownloadSignedUrlRequest } from 'generative-ai-use-cases';
import { initKnowledgeBaseS3Client } from './utils/bedrockClient';
import { getTenantId } from './utils/tenantUtils';
import { createTenantS3Client } from './utils/tenantS3Client';
import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
  determineBucketBaseName,
} from './utils/tenantS3Utils';

const MODEL_REGION = process.env.MODEL_REGION as string;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req = event.queryStringParameters as GetFileDownloadSignedUrlRequest;
    const tenantId = getTenantId(event);
    console.log(`Processing file download for tenant: ${tenantId}`);

    // Determine S3 client and bucket name based on tenant and request type
    let s3Client: S3Client;
    let bucketName = req.bucketName;

    if (isDefaultTenant(tenantId)) {
      // Default tenant or knowledge base
      s3Client =
        req.s3Type === 'knowledgeBase'
          ? await initKnowledgeBaseS3Client({
              region: req.region ?? MODEL_REGION,
            })
          : new S3Client({ region: req.region });
    } else {
      // Tenant-specific path: Generate deterministic bucket name
      console.log(
        `Generating deterministic bucket name for tenant: ${tenantId}`
      );

      // For tenant buckets, resolve the actual bucket name if not knowledge base
      if (req.s3Type !== 'knowledgeBase') {
        const baseName = determineBucketBaseName(req.bucketName);
        bucketName = await getTenantBucketNameByTenantId(
          tenantId,
          baseName as 'chat' | 'docs' | 'analytics',
          req.bucketName
        );
        console.log(`Found tenant bucket: ${bucketName}`);
      }

      // Create tenant-specific S3 client for signed URL generation (maintains tenant isolation)
      console.log(
        `Creating tenant-specific S3 client for signed URL generation`
      );
      s3Client = await createTenantS3Client(event);
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: req.filePrefix,
      ResponseContentType: req.contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

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
