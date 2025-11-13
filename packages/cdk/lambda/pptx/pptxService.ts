import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { v4 as uuid4 } from 'uuid';
import {
  getPptxTemplatesBucketName,
  getPptxOutputsBucketName,
} from './tenantPptxConfig';
import {
  createTenantS3Client,
  createTenantS3ClientForBackgroundJob,
} from '../utils/tenantS3Client';
import { isDefaultTenant } from '../utils/tenantS3Utils';

// Initialize AWS clients
const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

// Environment variables
const PPTX_GENERATION_QUEUE = process.env.PPTX_GENERATION_QUEUE!;

export interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export interface GenerationMessage {
  generation_id: string;
  user_id: string;
  tenant_id: string;
  instructions: string;
  chat_id?: string;
  template_id?: string;
  template_s3_key?: string;
  slide_count?: number;
  include_title_slide?: boolean;
  include_summary_slide?: boolean;
  model_id?: string;
  timestamp: string;
}

export async function generatePresignedUploadUrl(
  event: APIGatewayProxyEvent,
  tenantId: string,
  userId: string,
  filename: string,
  contentType: string = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  fileType: string = 'template'
): Promise<PresignedUrlResponse> {
  // Dynamically resolve bucket name based on tenant using existing utilities
  const bucket =
    fileType === 'template'
      ? await getPptxTemplatesBucketName(tenantId)
      : await getPptxOutputsBucketName(tenantId);

  const prefix =
    fileType === 'template'
      ? `templates/${tenantId}/${userId}`
      : `outputs/${tenantId}/${userId}`;

  // Add detailed logging for debugging
  console.log('generatePresignedUploadUrl called:', {
    bucket,
    fileType,
    tenantId,
    userId,
    filename,
    contentType,
  });

  // Generate unique S3 key
  const fileExtension = filename.split('.').pop()?.toLowerCase() || 'pptx';
  const uniqueFilename = `${uuid4()}.${fileExtension}`;
  const s3Key = `${prefix}/${uniqueFilename}`;

  // Use tenant-specific S3 client for cross-account access
  const tenantS3Client: S3Client = isDefaultTenant(tenantId)
    ? (() => {
        console.log('Using default S3 client for default tenant');
        return s3Client;
      })()
    : await (() => {
        console.log(
          'Creating tenant-specific S3 client for presigned URL generation'
        );
        return createTenantS3Client(event);
      })();

  // Generate presigned PUT URL for upload with normalized Content-Type
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(tenantS3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  console.log(`Generated presigned URL for upload: ${s3Key}`, {
    bucket,
    s3Key,
    contentType,
    filename,
    tenantId,
    userId,
  });

  return {
    uploadUrl: presignedUrl,
    s3Key,
    expiresIn: 3600,
  };
}

export async function getPptxDownloadUrl(
  event: APIGatewayProxyEvent,
  tenantId: string,
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucket = await getPptxOutputsBucketName(tenantId);

  // Create tenant-specific S3 client for cross-account access
  const tenantS3Client = isDefaultTenant(tenantId)
    ? s3Client
    : await createTenantS3Client(event);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  const presignedUrl = await getSignedUrl(tenantS3Client, command, {
    expiresIn,
  });

  console.log(
    `Generated presigned URL for download: ${s3Key}, tenant: ${tenantId}`
  );
  return presignedUrl;
}

export async function startPptxGeneration(
  generationId: string,
  userId: string,
  tenantId: string,
  instructions: string,
  chatId?: string,
  templateId?: string,
  templateS3Key?: string,
  slideCount?: number,
  includeTitleSlide: boolean = true,
  includeSummarySlide: boolean = false,
  modelId?: string
): Promise<void> {
  if (!PPTX_GENERATION_QUEUE) {
    throw new Error('PPTX generation queue not configured');
  }

  // Prepare message for SQS
  const messageBody: GenerationMessage = {
    generation_id: generationId,
    user_id: userId,
    tenant_id: tenantId,
    instructions,
    chat_id: chatId,
    template_id: templateId,
    template_s3_key: templateS3Key,
    slide_count: slideCount,
    include_title_slide: includeTitleSlide,
    include_summary_slide: includeSummarySlide,
    model_id: modelId,
    timestamp: new Date().toISOString(),
  };

  const command = new SendMessageCommand({
    QueueUrl: PPTX_GENERATION_QUEUE,
    MessageBody: JSON.stringify(messageBody),
    MessageAttributes: {
      generation_id: {
        StringValue: generationId,
        DataType: 'String',
      },
      user_id: {
        StringValue: userId,
        DataType: 'String',
      },
      tenant_id: {
        StringValue: tenantId,
        DataType: 'String',
      },
    },
  });

  const response = await sqsClient.send(command);
  console.log(
    `Queued PPTX generation: ${generationId}, Message ID: ${response.MessageId}`
  );
}

export async function loadTemplate(
  tenantId: string,
  s3Key: string
): Promise<Buffer> {
  const bucket = await getPptxTemplatesBucketName(tenantId);

  console.log('Loading template from S3:', { bucket, s3Key, tenantId });

  // Create tenant-specific S3 client for cross-account access
  const s3Client = await createTenantS3ClientForBackgroundJob(tenantId);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Template file not found');
  }

  const chunks: Uint8Array[] = [];
  const stream = response.Body as any;

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export function validateSlideCount(slideCount?: number): boolean {
  if (slideCount === undefined) return true;
  return slideCount >= 1 && slideCount <= 50;
}

export function validateInstructions(instructions: string): boolean {
  return instructions.length >= 1 && instructions.length <= 5000;
}

export function validateFileExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return lowerFilename.endsWith('.pptx') || lowerFilename.endsWith('.potx');
}
