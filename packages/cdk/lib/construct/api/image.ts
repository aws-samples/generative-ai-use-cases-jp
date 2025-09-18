import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';

export type ImgaeApiProps = GenericApiProps;

class ImageApi extends Construct {
  constructor(scope: Construct, id: string, props: ImgaeApiProps) {
    super(scope, id);

    const {
      modelRegion,
      modelIds,
      imageGenerationModelIds,
      videoGenerationModelIds,
      crossAccountBedrockRoleArn,
      litellmEndpoint,
      tenantManager,
      api,
      commonAuthorizerProps,
      sagemakerPolicy,
      litellmProxy,
      bedrockPolicy,
      logsPolicy,
      assumeRolePolicy,
    } = props;

    const generateImageFunction = new NodejsFunction(this, 'GenerateImage', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/generateImage.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        LITELLM_ENDPOINT: litellmEndpoint ?? '',

        // Tenant Management Environment Variables
        ...(tenantManager
          ? {
              TENANTS_TABLE_NAME: tenantManager.tenantsTable.tableName,
            }
          : {}),
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });

    // Grant tenants table read access if tenant manager is available
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(generateImageFunction);
    }

    const imageResource = api.root.addResource('image');
    const imageGenerateResource = imageResource.addResource('generate');

    // POST: /image/generate
    imageGenerateResource.addMethod(
      'POST',
      new LambdaIntegration(generateImageFunction),
      commonAuthorizerProps
    );

    if (sagemakerPolicy) {
      generateImageFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
    }
    if (litellmProxy) {
      litellmProxy.grantInvokeUrl(generateImageFunction);
    }
    if (bedrockPolicy) {
      generateImageFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    }
    if (logsPolicy) {
      generateImageFunction.role?.addToPrincipalPolicy(logsPolicy);
    }
    if (assumeRolePolicy) {
      generateImageFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
    }
  }
}

export default ImageApi;
