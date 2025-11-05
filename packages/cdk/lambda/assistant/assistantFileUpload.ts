/**
 * Assistant file upload URL generator
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RequestUploadUrlRequest } from 'generative-ai-use-cases';
import { getTenantId, getUsername } from '../utils/tenantUtils';
import { errorResponse, successResponse } from '../utils/apiResponse';
import { createTenantS3Client } from '../utils/tenantS3Client';
import { getTenantBucketNameByTenantId } from '../utils/tenantS3Utils';
import { getTenant } from '../tenantManager';

/**
 * Allowed file types for upload
 */
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json',
  'text/html',
];

/**
 * Maximum file size (100 MB)
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Validate file request
 */
function validateFileRequest(request: RequestUploadUrlRequest): string | null {
  if (!request.fileName || !request.fileSize || !request.contentType) {
    return 'Missing required fields: fileName, fileSize, contentType';
  }

  if (request.fileSize <= 0 || request.fileSize > MAX_FILE_SIZE) {
    return `File size must be between 1 byte and ${MAX_FILE_SIZE} bytes (100 MB)`;
  }

  if (!ALLOWED_CONTENT_TYPES.includes(request.contentType)) {
    return `Content type ${request.contentType} is not allowed`;
  }

  return null;
}

/**
 * Generate pre-signed upload URL
 */
async function generateUploadUrl(
  tenantId: string,
  username: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const request: RequestUploadUrlRequest = JSON.parse(event.body || '{}');

    // Validate request
    const validationError = validateFileRequest(request);
    if (validationError) {
      return errorResponse(400, validationError);
    }

    // Get tenant info for bucket resolution
    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return errorResponse(404, 'Tenant not found');
    }

    // Get tenant-specific bucket name for assistant files
    const bucketName = await getTenantBucketNameByTenantId(
      tenantId,
      'chat', // Using 'chat' bucket type for assistant files
      process.env.DOCUMENT_BUCKET || '',
      tenant.accountId || process.env.AWS_ACCOUNT_ID || '',
      tenant.region || process.env.AWS_REGION || 'us-east-1',
      process.env.ENVIRONMENT || 'dev'
    );

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `assistant-files/${username}/${timestamp}-${sanitizedFileName}`;

    // Create tenant-aware S3 client
    const s3Client = await createTenantS3Client(event);

    // Generate pre-signed URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: request.contentType,
      ContentLength: request.fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Construct S3 URL for later reference
    const s3Url = `s3://${bucketName}/${fileKey}`;

    return successResponse(200, {
      uploadUrl,
      s3Url,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return errorResponse(500, 'Failed to generate upload URL');
  }
}

/**
 * Main handler
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Assistant file upload handler invoked', {
    method: event.httpMethod,
    path: event.path,
  });

  try {
    // Extract tenant context
    const tenantId = getTenantId(event);
    const username = getUsername(event);

    // Only support POST for generating upload URLs
    if (event.httpMethod === 'POST') {
      return await generateUploadUrl(tenantId, username, event);
    }

    return errorResponse(405, 'Method not allowed');
  } catch (error) {
    console.error('Error in file upload handler:', error);
    return errorResponse(500, 'Internal server error');
  }
};
