import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as crypto from 'crypto';

export interface TenantS3Props {
  /**
   * The tenant identifier
   */
  readonly tenantId: string;

  /**
   * The environment (e.g., dev, staging, prod)
   */
  readonly environment: string;

  /**
   * Removal policy for buckets (true = DESTROY, false = RETAIN)
   */
  readonly removalPolicy: boolean;

  /**
   * Base name for the documents bucket
   * @default 'docs'
   */
  readonly documentsBucketBaseName?: string;

  /**
   * Base name for the chat attachments bucket
   * @default 'chat'
   */
  readonly chatBucketBaseName?: string;

  /**
   * Base name for the analytics bucket
   * @default 'analytics'
   */
  readonly analyticsBucketBaseName?: string;

  /**
   * Base name for the transcripts bucket
   * @default 'transcripts'
   */
  readonly transcriptsBucketBaseName?: string;

  /**
   * Base name for the videos bucket
   * @default 'videos'
   */
  readonly videosBucketBaseName?: string;

  /**
   * Base name for the PPTX templates bucket
   * @default 'pptx-templates'
   */
  readonly pptxTemplatesBucketBaseName?: string;

  /**
   * Base name for the PPTX outputs bucket
   * @default 'pptx-outputs'
   */
  readonly pptxOutputsBucketBaseName?: string;

  /**
   * Base name for the assistant files bucket
   * @default 'assistant-files'
   */
  readonly assistantFilesBucketBaseName?: string;

  /**
   * Whether to enable versioning on buckets
   * @default true
   */
  readonly enableVersioning?: boolean;

  /**
   * Whether to enable server access logging
   * @default true
   */
  readonly enableAccessLogging?: boolean;
}

export class TenantS3 extends Construct {
  /**
   * The documents bucket for the tenant
   */
  public readonly documentsBucket: s3.Bucket;

  /**
   * The chat attachments bucket for the tenant
   */
  public readonly chatBucket: s3.Bucket;

  /**
   * The analytics bucket for the tenant
   */
  public readonly analyticsBucket: s3.Bucket;

  /**
   * The transcripts bucket for the tenant
   */
  public readonly transcriptsBucket: s3.Bucket;

  /**
   * The videos bucket for the tenant
   */
  public readonly videosBucket: s3.Bucket;

  /**
   * The PPTX templates bucket for the tenant
   */
  public readonly pptxTemplatesBucket: s3.Bucket;

  /**
   * The PPTX outputs bucket for the tenant
   */
  public readonly pptxOutputsBucket: s3.Bucket;

  /**
   * The assistant files bucket for the tenant
   */
  public readonly assistantFilesBucket: s3.Bucket;

  /**
   * The tenant ID
   */
  public readonly tenantId: string;

  /**
   * Documents bucket name
   */
  public readonly documentsBucketName: string;

  /**
   * Chat attachments bucket name
   */
  public readonly chatBucketName: string;

  /**
   * Analytics bucket name
   */
  public readonly analyticsBucketName: string;

  /**
   * Transcripts bucket name
   */
  public readonly transcriptsBucketName: string;

  /**
   * Videos bucket name
   */
  public readonly videosBucketName: string;

  /**
   * PPTX templates bucket name
   */
  public readonly pptxTemplatesBucketName: string;

  /**
   * PPTX outputs bucket name
   */
  public readonly pptxOutputsBucketName: string;

  /**
   * Assistant files bucket name
   */
  public readonly assistantFilesBucketName: string;

  constructor(scope: Construct, id: string, props: TenantS3Props) {
    super(scope, id);

    this.tenantId = props.tenantId;

    // Validate tenant ID
    if (!this.tenantId || this.tenantId.trim() === '') {
      throw new Error('Tenant ID is required');
    }

    // Get environment
    const environment = props.environment;
    if (!environment || environment.trim() === '') {
      throw new Error('Environment is required');
    }

    // Sanitize tenant ID for use in resource names
    const sanitizedTenantId = this.tenantId
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .toLowerCase();

    // Set bucket base names
    const documentsBucketBaseName = props.documentsBucketBaseName || 'docs';
    const chatBucketBaseName = props.chatBucketBaseName || 'chat';
    const analyticsBucketBaseName =
      props.analyticsBucketBaseName || 'analytics';
    const transcriptsBucketBaseName =
      props.transcriptsBucketBaseName || 'transcripts';
    const videosBucketBaseName = props.videosBucketBaseName || 'videos';
    const pptxTemplatesBucketBaseName = props.pptxTemplatesBucketBaseName || 'pptx-templates';
    const pptxOutputsBucketBaseName = props.pptxOutputsBucketBaseName || 'pptx-outputs';
    const assistantFilesBucketBaseName = props.assistantFilesBucketBaseName || 'assistant-files';

    // Generate unique bucket names
    this.documentsBucketName = this.generateUniqueBucketName(
      documentsBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.chatBucketName = this.generateUniqueBucketName(
      chatBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.analyticsBucketName = this.generateUniqueBucketName(
      analyticsBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.transcriptsBucketName = this.generateUniqueBucketName(
      transcriptsBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.videosBucketName = this.generateUniqueBucketName(
      videosBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.pptxTemplatesBucketName = this.generateUniqueBucketName(
      pptxTemplatesBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.pptxOutputsBucketName = this.generateUniqueBucketName(
      pptxOutputsBucketBaseName,
      environment,
      sanitizedTenantId
    );
    this.assistantFilesBucketName = this.generateUniqueBucketName(
      assistantFilesBucketBaseName,
      environment,
      sanitizedTenantId
    );

    // Determine removal policy
    const removalPolicy = props.removalPolicy
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;

    // Create common bucket properties
    const commonBucketProps: Partial<s3.BucketProps> = {
      versioned: props.enableVersioning ?? true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: removalPolicy,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
    };

    // Create documents bucket
    this.documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      bucketName: this.documentsBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
    });

    // Add CORS configuration for documents bucket (needed for file uploads from browser)
    this.documentsBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [
        HttpMethods.GET,
        HttpMethods.POST,
        HttpMethods.PUT,
        HttpMethods.HEAD,
        HttpMethods.DELETE,
      ],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
        'x-amz-checksum-crc32',
        'x-amz-sdk-checksum-algorithm',
      ],
      maxAge: 3000,
    });

    // Create chat attachments bucket
    this.chatBucket = new s3.Bucket(this, 'ChatBucket', {
      bucketName: this.chatBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
    });

    // Add CORS configuration for chat bucket (needed for file uploads from browser)
    this.chatBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [
        HttpMethods.GET,
        HttpMethods.POST,
        HttpMethods.PUT,
        HttpMethods.HEAD,
        HttpMethods.DELETE,
      ],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
        'x-amz-checksum-crc32',
        'x-amz-sdk-checksum-algorithm',
      ],
      maxAge: 3000,
    });

    // Create analytics bucket
    this.analyticsBucket = new s3.Bucket(this, 'AnalyticsBucket', {
      bucketName: this.analyticsBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
      // No CORS needed for analytics bucket as it's primarily for backend use
    });

    // Create transcripts bucket
    this.transcriptsBucket = new s3.Bucket(this, 'TranscriptsBucket', {
      bucketName: this.transcriptsBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
      // No CORS needed for transcripts bucket as it's primarily for backend use
    });

    // Create videos bucket
    this.videosBucket = new s3.Bucket(this, 'VideosBucket', {
      bucketName: this.videosBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
      // No CORS needed for videos bucket as it's primarily for backend use
    });

    // Create PPTX templates bucket
    this.pptxTemplatesBucket = new s3.Bucket(this, 'PptxTemplatesBucket', {
      bucketName: this.pptxTemplatesBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
    });

    // Add CORS configuration for PPTX templates bucket (needed for file uploads from browser)
    this.pptxTemplatesBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT, HttpMethods.HEAD, HttpMethods.DELETE],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
        'x-amz-checksum-crc32',
        'x-amz-sdk-checksum-algorithm',
      ],
      maxAge: 3000,
    });

    // Create PPTX outputs bucket
    this.pptxOutputsBucket = new s3.Bucket(this, 'PptxOutputsBucket', {
      bucketName: this.pptxOutputsBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
    });

    // Add CORS configuration for PPTX outputs bucket (needed for downloads from browser)
    this.pptxOutputsBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
      ],
      maxAge: 3000,
    });

    // Create assistant files bucket
    this.assistantFilesBucket = new s3.Bucket(this, 'AssistantFilesBucket', {
      bucketName: this.assistantFilesBucketName,
      ...commonBucketProps,
      autoDeleteObjects: props.removalPolicy,
    });

    // Add CORS configuration for assistant files bucket (needed for file uploads from browser)
    this.assistantFilesBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [
        HttpMethods.GET,
        HttpMethods.POST,
        HttpMethods.PUT,
        HttpMethods.HEAD,
        HttpMethods.DELETE,
      ],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
        'x-amz-checksum-crc32',
        'x-amz-sdk-checksum-algorithm',
      ],
      maxAge: 3000,
    });

    // Add tags to all buckets
    const tags = {
      TenantId: this.tenantId,
      Environment: environment,
      Purpose: 'TenantS3Storage',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.documentsBucket).add(key, value);
      cdk.Tags.of(this.chatBucket).add(key, value);
      cdk.Tags.of(this.analyticsBucket).add(key, value);
      cdk.Tags.of(this.transcriptsBucket).add(key, value);
      cdk.Tags.of(this.videosBucket).add(key, value);
      cdk.Tags.of(this.pptxTemplatesBucket).add(key, value);
      cdk.Tags.of(this.pptxOutputsBucket).add(key, value);
      cdk.Tags.of(this.assistantFilesBucket).add(key, value);
    });

    // Output bucket ARNs and names
    new cdk.CfnOutput(this, 'DocumentsBucketArn', {
      value: this.documentsBucket.bucketArn,
      description: `ARN of the documents bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: this.documentsBucket.bucketName,
      description: `Name of the documents bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'ChatBucketArn', {
      value: this.chatBucket.bucketArn,
      description: `ARN of the chat attachments bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'ChatBucketName', {
      value: this.chatBucket.bucketName,
      description: `Name of the chat attachments bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'AnalyticsBucketArn', {
      value: this.analyticsBucket.bucketArn,
      description: `ARN of the analytics bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'AnalyticsBucketName', {
      value: this.analyticsBucket.bucketName,
      description: `Name of the analytics bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'TranscriptsBucketArn', {
      value: this.transcriptsBucket.bucketArn,
      description: `ARN of the transcripts bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'TranscriptsBucketName', {
      value: this.transcriptsBucket.bucketName,
      description: `Name of the transcripts bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'VideosBucketArn', {
      value: this.videosBucket.bucketArn,
      description: `ARN of the videos bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'VideosBucketName', {
      value: this.videosBucket.bucketName,
      description: `Name of the videos bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxTemplatesBucketArn', {
      value: this.pptxTemplatesBucket.bucketArn,
      description: `ARN of the PPTX templates bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxTemplatesBucketName', {
      value: this.pptxTemplatesBucket.bucketName,
      description: `Name of the PPTX templates bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxOutputsBucketArn', {
      value: this.pptxOutputsBucket.bucketArn,
      description: `ARN of the PPTX outputs bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'PptxOutputsBucketName', {
      value: this.pptxOutputsBucket.bucketName,
      description: `Name of the PPTX outputs bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'AssistantFilesBucketArn', {
      value: this.assistantFilesBucket.bucketArn,
      description: `ARN of the assistant files bucket for tenant ${this.tenantId}`,
    });

    new cdk.CfnOutput(this, 'AssistantFilesBucketName', {
      value: this.assistantFilesBucket.bucketName,
      description: `Name of the assistant files bucket for tenant ${this.tenantId}`,
    });
  }

  /**
   * Generate a deterministic S3 bucket name with the specified format
   *
   * Format: {BucketBaseName}-{environment}-tenant-{tenantId}-{guidHash}
   *
   * Structure breakdown:
   * 1. {BucketBaseName}: Base name (e.g., 'docs', 'chat', 'analytics')
   * 2. {environment}: Environment name (e.g., 'dev', 'staging', 'prod')
   * 3. 'tenant-': Fixed prefix to identify tenant resources
   * 4. {tenantId}: Sanitized tenant identifier
   * 5. {guidHash}: SHA256 hash of "{bucketBaseName}-{environment}-{tenantId}-{accountId}-{region}"
   *    truncated to fit within S3's 63-character limit
   *
   * Example: 'docs-dev-tenant-my-tenant-a1b2c3d4e5f6789012345678'
   * - BucketBaseName: 'docs'
   * - Environment: 'dev'
   * - TenantId: 'my-tenant'
   * - GuidHash: 'a1b2c3d4e5f6789012345678' (truncated hash for remaining space)
   *
   * Benefits:
   * - Same inputs always produce the same bucket name (idempotent deployments)
   * - No duplicate buckets created on re-deployment
   * - CDK can properly track and update existing resources
   * - Deterministic across environments and accounts
   * - Simplified naming without redundant hashes
   *
   * Total max length: 63 characters (AWS S3 limit)
   */
  private generateUniqueBucketName(
    bucketBaseName: string,
    environment: string,
    tenantId: string
  ): string {
    // AWS S3 bucket naming constraints
    const MAX_BUCKET_NAME_LENGTH = 63;
    const TENANT_PREFIX = 'tenant-';
    const SEPARATOR = '-';

    // Calculate available space for GUID hash
    const baseLength =
      bucketBaseName.length +
      SEPARATOR.length +
      environment.length +
      SEPARATOR.length +
      TENANT_PREFIX.length +
      tenantId.length +
      SEPARATOR.length;

    if (baseLength >= MAX_BUCKET_NAME_LENGTH) {
      throw new Error(
        `Bucket name base components too long: ${baseLength} characters. ` +
          `Consider shortening bucketBaseName, environment, or tenantId.`
      );
    }

    const remainingLength = MAX_BUCKET_NAME_LENGTH - baseLength;

    // Generate deterministic GUID hash for remaining space (use tenantId which is already sanitized)
    const guidHash = this.generateHash(
      `${bucketBaseName}-${environment}-${tenantId}-${this.getAccountInfo()}`,
      remainingLength
    );

    const bucketName = `${bucketBaseName}-${environment}-${TENANT_PREFIX}${tenantId}-${guidHash}`;

    // Final validation
    if (bucketName.length > MAX_BUCKET_NAME_LENGTH) {
      throw new Error(
        `Generated bucket name exceeds maximum length: ${bucketName.length} > ${MAX_BUCKET_NAME_LENGTH}`
      );
    }

    // Validate S3 bucket naming rules
    if (!/^[a-z0-9-]+$/.test(bucketName)) {
      throw new Error(
        `Generated bucket name contains invalid characters: ${bucketName}`
      );
    }

    if (bucketName.startsWith('-') || bucketName.endsWith('-')) {
      throw new Error(
        `Generated bucket name cannot start or end with hyphen: ${bucketName}`
      );
    }

    return bucketName;
  }

  /**
   * Generate a hash of specified length
   */
  private generateHash(input: string, length: number): string {
    return crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .substring(0, length);
  }

  /**
   * Get account and region info for hash generation
   */
  private getAccountInfo(): string {
    const stack = cdk.Stack.of(this);
    return `${stack.account || 'unknown'}-${stack.region || 'unknown'}`;
  }
}
