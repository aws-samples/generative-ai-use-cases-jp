import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { getTenantId } from './utils/tenantUtils';
import { createTenantS3Client } from './utils/tenantS3Client';
import { getTenant } from './tenantManager';
import {
  getTenantBucketNameByTenantId,
  isDefaultTenant,
  extractAccountIdFromRoleArn,
} from './utils/tenantS3Utils';
import {
  badRequest400Response,
  internalServerError500Response,
  ok200Response,
  unauthorized401Response,
} from './utils/apiResponse';

const MANAGED_BUCKET_NAME = process.env.ASSISTANT_FILES_BUCKET_NAME;
const UPLOAD_EXPIRATION_SECONDS = 300; // 5 minutes

interface RequestPresignedUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

interface RequestPresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Request a pre-signed URL for file upload
 * POST /assistant/upload-url
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Check bucket configuration
    if (!MANAGED_BUCKET_NAME) {
      return internalServerError500Response({
        message: 'File upload not configured',
      });
    }

    // Parse request
    const body: RequestPresignedUrlRequest = JSON.parse(event.body || '{}');

    // Validate request
    if (!body.fileName || !body.fileSize || !body.contentType) {
      return badRequest400Response({
        message: 'Missing required fields: fileName, fileSize, contentType',
      });
    }

    // Validate file size (10 MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (body.fileSize > MAX_FILE_SIZE) {
      return badRequest400Response({
        message: `File size exceeds limit of ${MAX_FILE_SIZE} bytes`,
      });
    }

    // Validate content type
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'text/csv',
      'application/pdf',
    ];

    if (!allowedTypes.some((type) => body.contentType.includes(type))) {
      return badRequest400Response({
        message: `Unsupported file type: ${body.contentType}. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    // Get user ID from authorizer (use cognito:username to match assistantHandler)
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    if (!userId) {
      return unauthorized401Response({ message: 'Unauthorized' });
    }

    // Get tenant-aware S3 bucket and client
    const tenantId = getTenantId(event);
    const isDefault = isDefaultTenant(tenantId);

    let bucketName: string;
    let s3Client: S3Client;

    if (isDefault) {
      // Default tenant uses the fallback bucket
      if (!MANAGED_BUCKET_NAME) {
        return internalServerError500Response({
          message: 'File upload not configured for default tenant',
        });
      }
      bucketName = MANAGED_BUCKET_NAME;
      s3Client = new S3Client({});
    } else {
      // Tenant-account uses tenant-specific bucket with assumed role
      const tenant = await getTenant(tenantId);

      if (!tenant || !tenant.roleArn || !tenant.region || !tenant.environment) {
        return internalServerError500Response({
          message: 'Tenant configuration incomplete',
        });
      }

      const tenantAccountId = extractAccountIdFromRoleArn(tenant.roleArn);
      if (!tenantAccountId) {
        return internalServerError500Response({
          message: `Cannot extract account ID from role ARN: ${tenant.roleArn}`,
        });
      }

      const tenantRegion = tenant.region;
      const tenantEnvironment = tenant.environment;

      bucketName = await getTenantBucketNameByTenantId(
        tenantId,
        'docs', // Use 'docs' bucket type for assistant files
        MANAGED_BUCKET_NAME || '',
        tenantAccountId,
        tenantRegion,
        tenantEnvironment
      );

      s3Client = await createTenantS3Client(event);
    }

    // Generate storage key
    const fileId = crypto.randomUUID();
    const sanitizedFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `assistant-files/${userId}/${fileId}/${sanitizedFileName}`;

    // Create pre-signed URL
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      ContentType: body.contentType,
      Metadata: {
        userId,
        originalFileName: body.fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRATION_SECONDS,
    });

    const response: RequestPresignedUrlResponse = {
      uploadUrl,
      fileKey: storageKey,
      expiresIn: UPLOAD_EXPIRATION_SECONDS,
    };

    return ok200Response(response);
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);

    return internalServerError500Response({
      message: 'Internal server error',
    });
  }
};
