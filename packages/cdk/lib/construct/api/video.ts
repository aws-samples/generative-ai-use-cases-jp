import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { GenericApiProps } from './props';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Construct } from 'constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export type VideoApiProps = GenericApiProps;

class VideoApi extends Construct {
  constructor(scope: Construct, id: string, props: VideoApiProps) {
    super(scope, id);

    const {
      modelRegion,
      modelIds,
      imageGenerationModelIds,
      videoGenerationModelIds,
      videoBucketRegionMap,
      crossAccountBedrockRoleArn,
      fileBucket,
      litellmEndpoint,
      api,
      commonAuthorizerProps,
      table,
      sagemakerPolicy,
      bedrockPolicy,
      logsPolicy,
      assumeRolePolicy,
      litellmProxy,
      tenantManager,
    } = props;

    const generateVideoFunction = new NodejsFunction(this, 'GenerateVideo', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/generateVideo.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props, {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        VIDEO_BUCKET_OWNER: Stack.of(this).account,
        VIDEO_BUCKET_REGION_MAP: JSON.stringify(videoBucketRegionMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
        LITELLM_ENDPOINT: litellmEndpoint ?? '',
      }),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    for (const region of Object.keys(videoBucketRegionMap)) {
      const bucketName = videoBucketRegionMap[region];
      generateVideoFunction.role?.addToPrincipalPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject'],
          resources: [
            `arn:aws:s3:::${bucketName}`,
            `arn:aws:s3:::${bucketName}/*`,
          ],
        })
      );
    }
    table.grantWriteData(generateVideoFunction);

    const copyVideoJob = new NodejsFunction(this, 'CopyVideoJob', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/copyVideoJob.ts',
      timeout: Duration.minutes(15),
      memorySize: 512,
      environment: getBaseEnvironment(this, props, {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        VIDEO_BUCKET_REGION_MAP: JSON.stringify(videoBucketRegionMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
      }),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    for (const region of Object.keys(videoBucketRegionMap)) {
      const bucketName = videoBucketRegionMap[region];
      copyVideoJob.role?.addToPrincipalPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
          resources: [
            `arn:aws:s3:::${bucketName}`,
            `arn:aws:s3:::${bucketName}/*`,
          ],
        })
      );
    }
    fileBucket.grantWrite(copyVideoJob);
    table.grantWriteData(copyVideoJob);

    const listVideoJobs = new NodejsFunction(this, 'ListVideoJobs', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listVideoJobs.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props, {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        VIDEO_BUCKET_REGION_MAP: JSON.stringify(videoBucketRegionMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
        COPY_VIDEO_JOB_FUNCTION_ARN: copyVideoJob.functionArn,
      }),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    table.grantReadWriteData(listVideoJobs);
    copyVideoJob.grantInvoke(listVideoJobs);

    const deleteVideoJob = new NodejsFunction(this, 'DeleteVideoJob', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteVideoJob.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(this, props, {
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
      }),
    });
    table.grantWriteData(deleteVideoJob);

    const videoResource = api.root.addResource('video');
    const videoGenerateResource = videoResource.addResource('generate');
    // POST: /video/generate
    videoGenerateResource.addMethod(
      'POST',
      new LambdaIntegration(generateVideoFunction),
      commonAuthorizerProps
    );
    // GET: /video/generate
    videoGenerateResource.addMethod(
      'GET',
      new LambdaIntegration(listVideoJobs),
      commonAuthorizerProps
    );
    const videoJobResource = videoGenerateResource.addResource('{createdDate}');
    // DELETE: /video/generate/{createdDate}
    videoJobResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteVideoJob),
      commonAuthorizerProps
    );

    if (sagemakerPolicy) {
      generateVideoFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      listVideoJobs.role?.addToPrincipalPolicy(sagemakerPolicy);
    }
    if (litellmProxy) {
      litellmProxy.grantInvokeUrl(generateVideoFunction);
      litellmProxy.grantInvokeUrl(listVideoJobs);
    }
    if (bedrockPolicy) {
      generateVideoFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      listVideoJobs.role?.addToPrincipalPolicy(bedrockPolicy);
    }
    if (logsPolicy) {
      generateVideoFunction.role?.addToPrincipalPolicy(logsPolicy);
      listVideoJobs.role?.addToPrincipalPolicy(logsPolicy);
    }
    if (assumeRolePolicy) {
      generateVideoFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      listVideoJobs.role?.addToPrincipalPolicy(assumeRolePolicy);
    }
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(generateVideoFunction);
      tenantManager.tenantsTable.grantReadData(copyVideoJob);
      tenantManager.tenantsTable.grantReadData(listVideoJobs);
      tenantManager.tenantsTable.grantReadData(deleteVideoJob);
    }
  }
}

export default VideoApi;
