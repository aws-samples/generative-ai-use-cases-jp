import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TenantS3 } from '../../construct/tenant-s3';

export interface TenantS3StackProps extends cdk.StackProps {
  /**
   * The tenant identifier
   */
  readonly tenantId?: string;

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
   * Whether to enable versioning on buckets
   * @default true
   */
  readonly enableVersioning?: boolean;

  /**
   * Whether to enable server access logging
   * @default true
   */
  readonly enableAccessLogging?: boolean;

  /**
   * Description for the stack
   * @default 'S3 buckets for tenant {tenantId}'
   */
  readonly description?: string;
}

/**
 * Stack for creating tenant-specific S3 buckets
 */
export class TenantS3Stack extends cdk.Stack {
  /**
   * The tenant S3 construct
   */
  private readonly tenantS3: TenantS3;

  constructor(scope: Construct, id: string, props?: TenantS3StackProps) {
    super(scope, id, props);

    // Create parameter if tenant ID not provided
    const tenantId =
      props?.tenantId ||
      new cdk.CfnParameter(this, 'TenantId', {
        description: 'The tenant identifier for the S3 buckets',
        type: 'String',
        allowedPattern: '^[a-zA-Z0-9-]+$',
        constraintDescription:
          'Tenant ID must contain only alphanumeric characters and hyphens',
      }).valueAsString;

    // Get environment (required parameter)
    const environment = props?.environment!;

    // Get removal policy (required parameter)
    const removalPolicy = props?.removalPolicy!;

    // Create the tenant S3 construct
    this.tenantS3 = new TenantS3(this, 'TenantS3', {
      tenantId,
      environment,
      removalPolicy,
      documentsBucketBaseName: props?.documentsBucketBaseName,
      chatBucketBaseName: props?.chatBucketBaseName,
      analyticsBucketBaseName: props?.analyticsBucketBaseName,
      transcriptsBucketBaseName: props?.transcriptsBucketBaseName,
      videosBucketBaseName: props?.videosBucketBaseName,
      enableVersioning: props?.enableVersioning,
      enableAccessLogging: props?.enableAccessLogging,
    });

    // Add stack-level outputs with export names
    // Documents Bucket outputs
    new cdk.CfnOutput(this, 'StackDocumentsBucketArn', {
      value: this.tenantS3.documentsBucket.bucketArn,
      description: `ARN of the documents bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-DocumentsBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackDocumentsBucketName', {
      value: this.tenantS3.documentsBucket.bucketName,
      description: `Name of the documents bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-DocumentsBucketName`,
    });

    new cdk.CfnOutput(this, 'StackDocumentsBucketDomainName', {
      value: this.tenantS3.documentsBucket.bucketDomainName,
      description: `Domain name of the documents bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-DocumentsBucketDomainName`,
    });

    // Chat Bucket outputs
    new cdk.CfnOutput(this, 'StackChatBucketArn', {
      value: this.tenantS3.chatBucket.bucketArn,
      description: `ARN of the chat attachments bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-ChatBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackChatBucketName', {
      value: this.tenantS3.chatBucket.bucketName,
      description: `Name of the chat attachments bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-ChatBucketName`,
    });

    new cdk.CfnOutput(this, 'StackChatBucketDomainName', {
      value: this.tenantS3.chatBucket.bucketDomainName,
      description: `Domain name of the chat attachments bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-ChatBucketDomainName`,
    });

    // Analytics Bucket outputs
    new cdk.CfnOutput(this, 'StackAnalyticsBucketArn', {
      value: this.tenantS3.analyticsBucket.bucketArn,
      description: `ARN of the analytics bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-AnalyticsBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackAnalyticsBucketName', {
      value: this.tenantS3.analyticsBucket.bucketName,
      description: `Name of the analytics bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-AnalyticsBucketName`,
    });

    new cdk.CfnOutput(this, 'StackAnalyticsBucketDomainName', {
      value: this.tenantS3.analyticsBucket.bucketDomainName,
      description: `Domain name of the analytics bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-AnalyticsBucketDomainName`,
    });

    // Transcripts Bucket outputs
    new cdk.CfnOutput(this, 'StackTranscriptsBucketArn', {
      value: this.tenantS3.transcriptsBucket.bucketArn,
      description: `ARN of the transcripts bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-TranscriptsBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackTranscriptsBucketName', {
      value: this.tenantS3.transcriptsBucket.bucketName,
      description: `Name of the transcripts bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-TranscriptsBucketName`,
    });

    new cdk.CfnOutput(this, 'StackTranscriptsBucketDomainName', {
      value: this.tenantS3.transcriptsBucket.bucketDomainName,
      description: `Domain name of the transcripts bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-TranscriptsBucketDomainName`,
    });

    // Videos Bucket outputs
    new cdk.CfnOutput(this, 'StackVideosBucketArn', {
      value: this.tenantS3.videosBucket.bucketArn,
      description: `ARN of the videos bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-VideosBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackVideosBucketName', {
      value: this.tenantS3.videosBucket.bucketName,
      description: `Name of the videos bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-VideosBucketName`,
    });

    new cdk.CfnOutput(this, 'StackVideosBucketDomainName', {
      value: this.tenantS3.videosBucket.bucketDomainName,
      description: `Domain name of the videos bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-VideosBucketDomainName`,
    });

    // PPTX Templates Bucket outputs
    new cdk.CfnOutput(this, 'StackPptxTemplatesBucketArn', {
      value: this.tenantS3.pptxTemplatesBucket.bucketArn,
      description: `ARN of the PPTX templates bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-PptxTemplatesBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackPptxTemplatesBucketName', {
      value: this.tenantS3.pptxTemplatesBucket.bucketName,
      description: `Name of the PPTX templates bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-PptxTemplatesBucketName`,
    });

    // PPTX Outputs Bucket outputs
    new cdk.CfnOutput(this, 'StackPptxOutputsBucketArn', {
      value: this.tenantS3.pptxOutputsBucket.bucketArn,
      description: `ARN of the PPTX outputs bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-PptxOutputsBucketArn`,
    });

    new cdk.CfnOutput(this, 'StackPptxOutputsBucketName', {
      value: this.tenantS3.pptxOutputsBucket.bucketName,
      description: `Name of the PPTX outputs bucket for tenant ${tenantId}`,
      exportName: `${this.stackName}-PptxOutputsBucketName`,
    });

    // Add tags
    cdk.Tags.of(this).add('TenantId', tenantId.toString());
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Purpose', 'TenantS3Buckets');
    cdk.Tags.of(this).add('RemovalPolicy', removalPolicy.toString());

    // Set stack description
    this.templateOptions.description =
      props?.description ||
      `Creates tenant-specific S3 buckets for multi-tenant application (tenant: ${tenantId})`;
  }

  /**
   * Get the tenant S3 construct
   */
  public getTenantS3(): TenantS3 {
    return this.tenantS3;
  }

  /**
   * Get the documents bucket
   */
  public getDocumentsBucket() {
    return this.tenantS3.documentsBucket;
  }

  /**
   * Get the chat bucket
   */
  public getChatBucket() {
    return this.tenantS3.chatBucket;
  }

  /**
   * Get the analytics bucket
   */
  public getAnalyticsBucket() {
    return this.tenantS3.analyticsBucket;
  }

  /**
   * Get the transcripts bucket
   */
  public getTranscriptsBucket() {
    return this.tenantS3.transcriptsBucket;
  }

  /**
   * Get the videos bucket
   */
  public getVideosBucket() {
    return this.tenantS3.videosBucket;
  }

  /**
   * Get the PPTX templates bucket
   */
  public getPptxTemplatesBucket() {
    return this.tenantS3.pptxTemplatesBucket;
  }

  /**
   * Get the PPTX outputs bucket
   */
  public getPptxOutputsBucket() {
    return this.tenantS3.pptxOutputsBucket;
  }
}
