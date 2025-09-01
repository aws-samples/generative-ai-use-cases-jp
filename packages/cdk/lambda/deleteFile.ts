import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DeleteFileRequest } from 'generative-ai-use-cases';
import { getTenantId } from './utils/tenantUtils';
import { createTenantS3Client } from './utils/tenantS3Client';
import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
} from './utils/tenantS3Utils';

// Constants
const DEFAULT_BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req = event.pathParameters as DeleteFileRequest;
    // Extract tenant ID from Cognito authorizer claims
    const tenantId = getTenantId(event);
    console.log(`Processing file deletion for tenant: ${tenantId}`);
    console.log(`Request fileName: ${req.fileName}`);

    // Get appropriate bucket name (tenant-specific or fallback)
    const bucketName = await getTenantBucketNameByTenantId(
      tenantId,
      'chat',
      DEFAULT_BUCKET_NAME
    );
    console.log(`Using bucket for delete operation: ${bucketName}`);

    // Use tenant-specific S3 client and bucket
    let s3Client: S3Client;

    if (isDefaultTenant(tenantId)) {
      // Default tenant path - simple and clear
      console.log('Using default S3 client for default tenant');
      s3Client = new S3Client({});
    } else {
      // Create tenant-specific S3 client for delete operation (maintains tenant isolation)
      console.log(`Creating tenant-specific S3 client for delete operation`);
      s3Client = await createTenantS3Client(event);
    }

    console.log(
      `Final delete operation - Bucket: ${bucketName}, Key: ${req.fileName}`
    );
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: req.fileName,
    });

    await s3Client.send(command);

    return {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
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
