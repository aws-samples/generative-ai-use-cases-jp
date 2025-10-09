import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { GenericApiProps } from './props';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { getBaseEnvironment } from './util';

/**
 * Central PPTX API construct for multi-tenant architecture
 *
 * This construct creates PPTX API endpoints in the central control plane.
 * Lambda functions dynamically access tenant-specific DynamoDB tables and S3 buckets
 * based on the tenant ID extracted from Cognito claims.
 *
 * Key differences from per-tenant approach:
 * - Single set of Lambda functions for all tenants
 * - IAM permissions granted via wildcard patterns for all tenant resources
 * - No hardcoded table/bucket names - dynamically resolved at runtime
 */
export class CentralPptxApi extends Construct {
  readonly generationQueue: sqs.Queue;
  readonly pptxLambdaRole: iam.Role;

  constructor(scope: Construct, id: string, props: GenericApiProps) {
    super(scope, id);

    const { api, commonAuthorizerProps } = props;

    // Create SQS queue for PPTX generation (shared across all tenants)
    this.generationQueue = new sqs.Queue(this, 'PptxGenerationQueue', {
      queueName: `pptx-generation-queue-${props.environment}`,
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
    });

    // Create shared IAM role for Lambda functions with permissions for all tenant resources
    this.pptxLambdaRole = new iam.Role(this, 'PptxLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions for all tenant tables (wildcard pattern)
    this.pptxLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        `arn:aws:dynamodb:*:*:table/pptx-templates-${props.environment}-*`,
        `arn:aws:dynamodb:*:*:table/pptx-templates-${props.environment}-*/index/*`,
        `arn:aws:dynamodb:*:*:table/pptx-generations-${props.environment}-*`,
        `arn:aws:dynamodb:*:*:table/pptx-generations-${props.environment}-*/index/*`,
      ],
    }));

    // Grant S3 permissions for all tenant buckets (wildcard pattern)
    // Pattern matches: {base}-{environment}-tenant-{tenantId}-{hash}
    this.pptxLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        `arn:aws:s3:::pptx-templates-${props.environment}-tenant-*`,
        `arn:aws:s3:::pptx-templates-${props.environment}-tenant-*/*`,
        `arn:aws:s3:::pptx-outputs-${props.environment}-tenant-*`,
        `arn:aws:s3:::pptx-outputs-${props.environment}-tenant-*/*`,
      ],
    }));

    // Grant SQS permissions
    this.generationQueue.grantSendMessages(this.pptxLambdaRole);

    // Grant Bedrock permissions for AI-powered PPTX content generation
    this.pptxLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock:Converse',
        'bedrock:ConverseStream',
        'bedrock:StartAsyncInvoke',
      ],
      resources: ['*'], // Bedrock models/inference profiles don't have tenant-specific ARNs
    }));

    // Grant STS AssumeRole permissions for cross-account tenant access
    // Allows background jobs to assume TenantRole in tenant accounts
    this.pptxLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::*:role/TenantRole-*`],
    }));

    // Common Lambda props
    const commonLambdaProps = {
      runtime: LAMBDA_RUNTIME_NODEJS,
      timeout: Duration.minutes(1),
      role: this.pptxLambdaRole,
      environment: getBaseEnvironment(this, props, {
        MODEL_REGION: props.modelRegion,
        MODEL_IDS: JSON.stringify(props.modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(props.imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(props.videoGenerationModelIds),
        PPTX_GENERATION_QUEUE: this.generationQueue.queueUrl,
        LITELLM_ENDPOINT: props.litellmEndpoint ?? '',
        // Note: Bucket names are dynamically resolved per-tenant in Lambda code
        // These serve as fallback patterns for tenant bucket resolution
        PPTX_TEMPLATES_BUCKET_PATTERN: `pptx-templates-${props.environment}-tenant`,
        PPTX_OUTPUTS_BUCKET_PATTERN: `pptx-outputs-${props.environment}-tenant`,
      }),
    };

    // Template Upload URL Lambda
    const getTemplateUploadUrlLambda = new NodejsFunction(this, 'GetTemplateUploadUrl', {
      ...commonLambdaProps,
      entry: './lambda/pptx/getTemplateUploadUrl.ts',
      handler: 'handler',
    });

    // Create Template Lambda
    const createTemplateLambda = new NodejsFunction(this, 'CreateTemplate', {
      ...commonLambdaProps,
      entry: './lambda/pptx/createTemplate.ts',
      handler: 'handler',
    });

    // List Templates Lambda
    const listTemplatesLambda = new NodejsFunction(this, 'ListTemplates', {
      ...commonLambdaProps,
      entry: './lambda/pptx/listTemplates.ts',
      handler: 'handler',
    });

    // Delete Template Lambda
    const deleteTemplateLambda = new NodejsFunction(this, 'DeleteTemplate', {
      ...commonLambdaProps,
      entry: './lambda/pptx/deleteTemplate.ts',
      handler: 'handler',
    });

    // Generate PPTX Lambda
    const generatePptxLambda = new NodejsFunction(this, 'GeneratePptx', {
      ...commonLambdaProps,
      entry: './lambda/pptx/generatePptx.ts',
      handler: 'handler',
    });

    // Get Generation Status Lambda
    const getGenerationStatusLambda = new NodejsFunction(this, 'GetGenerationStatus', {
      ...commonLambdaProps,
      entry: './lambda/pptx/getGenerationStatus.ts',
      handler: 'handler',
    });

    // List Generations Lambda
    const listGenerationsLambda = new NodejsFunction(this, 'ListGenerations', {
      ...commonLambdaProps,
      entry: './lambda/pptx/listGenerations.ts',
      handler: 'handler',
    });

    // Download PPTX Lambda
    const downloadPptxLambda = new NodejsFunction(this, 'DownloadPptx', {
      ...commonLambdaProps,
      entry: './lambda/pptx/downloadPptx.ts',
      handler: 'handler',
    });

    // PPTX Generation Worker Lambda (SQS Consumer)
    const pptxGenerationWorkerLambda = new NodejsFunction(this, 'PptxGenerationWorker', {
      ...commonLambdaProps,
      entry: './lambda/pptxGeneration.ts',
      handler: 'handler',
      timeout: Duration.minutes(5), // Longer timeout for PPTX generation
    });

    // Grant SQS consume permissions
    this.generationQueue.grantConsumeMessages(pptxGenerationWorkerLambda);

    // Add SQS event source mapping
    pptxGenerationWorkerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(this.generationQueue, {
        batchSize: 1,
        maxBatchingWindow: Duration.seconds(0),
      })
    );

    // API: /pptx
    const pptxRootResource = api.root.addResource('pptx');

    // API: /pptx/template
    const templateResource = pptxRootResource.addResource('template');

    // POST: /pptx/template/upload-url
    const uploadUrlResource = templateResource.addResource('upload-url');
    uploadUrlResource.addMethod(
      'POST',
      new LambdaIntegration(getTemplateUploadUrlLambda),
      commonAuthorizerProps
    );

    // POST: /pptx/template
    templateResource.addMethod(
      'POST',
      new LambdaIntegration(createTemplateLambda),
      commonAuthorizerProps
    );

    // GET: /pptx/template
    templateResource.addMethod(
      'GET',
      new LambdaIntegration(listTemplatesLambda),
      commonAuthorizerProps
    );

    // DELETE: /pptx/template/{templateId}
    const templateIdResource = templateResource.addResource('{templateId}');
    templateIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteTemplateLambda),
      commonAuthorizerProps
    );

    // API: /pptx/generate
    const generateResource = pptxRootResource.addResource('generate');
    generateResource.addMethod(
      'POST',
      new LambdaIntegration(generatePptxLambda),
      commonAuthorizerProps
    );

    // API: /pptx/generation
    const generationResource = pptxRootResource.addResource('generation');

    // GET: /pptx/generation
    generationResource.addMethod(
      'GET',
      new LambdaIntegration(listGenerationsLambda),
      commonAuthorizerProps
    );

    // GET: /pptx/generation/{generationId}
    const generationIdResource = generationResource.addResource('{generationId}');
    generationIdResource.addMethod(
      'GET',
      new LambdaIntegration(getGenerationStatusLambda),
      commonAuthorizerProps
    );

    // API: /pptx/download/{generationId}
    const downloadResource = pptxRootResource.addResource('download');
    const downloadIdResource = downloadResource.addResource('{generationId}');
    downloadIdResource.addMethod(
      'GET',
      new LambdaIntegration(downloadPptxLambda),
      commonAuthorizerProps
    );

    // Grant Tenants table read access to Lambda role
    // All Lambda functions need this to call getTenant() for tenant credential resolution
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(this.pptxLambdaRole);
    }

    // Grant LiteLLM proxy invoke permissions to PPTX generation worker
    if (props.litellmProxy) {
      props.litellmProxy.grantInvokeUrl(pptxGenerationWorkerLambda);
    }
  }
}
