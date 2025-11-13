import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { GenericApiProps } from './props';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { PptxDb } from '../pptx-db';

export interface PptxApiExtraProps {
  readonly pptxDb: PptxDb;
  readonly pptxTemplatesBucketName: string;
  readonly pptxOutputsBucketName: string;
}

export type PptxApiProps = GenericApiProps & PptxApiExtraProps;

class PptxApi extends Construct {
  readonly generationQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: PptxApiProps) {
    super(scope, id);

    const {
      api,
      commonAuthorizerProps,
      pptxDb,
      pptxTemplatesBucketName,
      pptxOutputsBucketName,
    } = props;

    // Create SQS queue for PPTX generation
    this.generationQueue = new sqs.Queue(this, 'PptxGenerationQueue', {
      queueName: `pptx-generation-queue-${props.environment}`,
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(7),
    });

    // Create shared IAM role for Lambda functions
    const lambdaRole = new iam.Role(this, 'PptxLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    // Grant DynamoDB permissions
    pptxDb.templatesTable.grantFullAccess(lambdaRole);
    pptxDb.generationsTable.grantFullAccess(lambdaRole);

    // Grant SQS permissions
    this.generationQueue.grantSendMessages(lambdaRole);

    // Common Lambda props
    const commonLambdaProps = {
      runtime: LAMBDA_RUNTIME_NODEJS,
      timeout: Duration.minutes(1),
      role: lambdaRole,
      environment: getBaseEnvironment(this, props, {
        PPTX_TEMPLATES_TABLE: pptxDb.templatesTable.tableName,
        PPTX_GENERATIONS_TABLE: pptxDb.generationsTable.tableName,
        PPTX_TEMPLATES_BUCKET: pptxTemplatesBucketName,
        PPTX_OUTPUTS_BUCKET: pptxOutputsBucketName,
        PPTX_GENERATION_QUEUE: this.generationQueue.queueUrl,
      }),
    };

    // Template Upload URL Lambda
    const getTemplateUploadUrlLambda = new NodejsFunction(
      this,
      'GetTemplateUploadUrl',
      {
        ...commonLambdaProps,
        entry: './lambda/pptx/getTemplateUploadUrl.ts',
        handler: 'handler',
      }
    );

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
    const getGenerationStatusLambda = new NodejsFunction(
      this,
      'GetGenerationStatus',
      {
        ...commonLambdaProps,
        entry: './lambda/pptx/getGenerationStatus.ts',
        handler: 'handler',
      }
    );

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
    const pptxGenerationWorkerLambda = new NodejsFunction(
      this,
      'PptxGenerationWorker',
      {
        ...commonLambdaProps,
        entry: './lambda/pptxGeneration.ts',
        handler: 'handler',
        timeout: Duration.minutes(5), // Longer timeout for PPTX generation
      }
    );

    // Grant SQS consume permissions
    this.generationQueue.grantConsumeMessages(pptxGenerationWorkerLambda);

    // Add SQS event source mapping
    pptxGenerationWorkerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(this.generationQueue, {
        batchSize: 1,
        maxBatchingWindow: Duration.seconds(0),
      })
    );

    // Grant S3 permissions to all Lambda functions
    // Note: We can't directly reference buckets since they're tenant-specific,
    // so we grant permissions via the role using bucket names
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          `arn:aws:s3:::${pptxTemplatesBucketName}/*`,
          `arn:aws:s3:::${pptxTemplatesBucketName}`,
          `arn:aws:s3:::${pptxOutputsBucketName}/*`,
          `arn:aws:s3:::${pptxOutputsBucketName}`,
        ],
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
    const generationIdResource =
      generationResource.addResource('{generationId}');
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
  }
}

export default PptxApi;
