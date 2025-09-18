import { Construct } from 'constructs';
import { GenericApiProps } from './props';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import { Duration } from 'aws-cdk-lib';
import { getBaseEnvironment } from './util';

export type PredictApiProps = GenericApiProps;

class PredictApi extends Construct {
  readonly predictStreamFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: PredictApiProps) {
    super(scope, id);

    const {
      modelRegion,
      modelIds,
      imageGenerationModelIds,
      videoGenerationModelIds,
      crossAccountBedrockRoleArn,
      guardrailIdentify,
      guardrailVersion,
      tenantManager,
      openai,
      userPool,
      userPoolClient,
      agentMap,
      api,
      commonAuthorizerProps,
      table,
      fileBucket,
      knowledgeBaseId,
      queryDecompositionEnabled,
      rerankingModelId,
      litellmEndpoint,
      idPool,
      bedrockPolicy,
      sagemakerPolicy,
      logsPolicy,
      assumeRolePolicy,
      litellmProxy,
    } = props;

    const predictFunction = new NodejsFunction(this, 'Predict', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/predict.ts',
      timeout: Duration.minutes(15),
      environment: {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        ...(guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: guardrailIdentify }
          : {}),
        ...(guardrailVersion ? { GUARDRAIL_VERSION: guardrailVersion } : {}),

        // LangChain Credentials
        OPENAI_API_KEY: openai?.apiKey ?? '',

        // Tenant Management Environment Variables
        ...(tenantManager
          ? {
              TENANTS_TABLE_NAME: tenantManager.tenantsTable.tableName,
            }
          : {}),
      },
      bundling: {
        nodeModules: [
          '@aws-sdk/client-bedrock-runtime',

          '@langchain/core',
          '@langchain/openai',
        ],
      },
    });

    const predictStreamFunction = new NodejsFunction(this, 'PredictStream', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/predictStream.ts',
      timeout: Duration.minutes(15),
      memorySize: 256,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        AGENT_MAP: JSON.stringify(agentMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
        KNOWLEDGE_BASE_ID: knowledgeBaseId ?? '',
        ...(guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: guardrailIdentify }
          : {}),
        ...(guardrailVersion ? { GUARDRAIL_VERSION: guardrailVersion } : {}),
        QUERY_DECOMPOSITION_ENABLED: JSON.stringify(queryDecompositionEnabled),
        RERANKING_MODEL_ID: rerankingModelId ?? '',
        LITELLM_ENDPOINT: litellmEndpoint ?? '',

        // LangChain Credentials
        OPENAI_API_KEY: openai?.apiKey ?? '',

        // Tenant Management Environment Variables
        ...(tenantManager
          ? {
              TENANTS_TABLE_NAME: tenantManager.tenantsTable.tableName,
            }
          : {}),
      },
      bundling: {
        nodeModules: [
          'aws-jwt-verify',
          '@aws-sdk/client-bedrock-runtime',
          '@aws-sdk/client-bedrock-agent-runtime',
          // The default version of client-sagemaker-runtime does not support StreamingResponse, so specify the version in package.json for bundling
          '@aws-sdk/client-sagemaker-runtime',

          '@langchain/core',
          '@langchain/openai',
        ],
      },
    });
    fileBucket.grantReadWrite(predictStreamFunction);
    predictStreamFunction.grantInvoke(idPool.authenticatedRole);

    const predictTitleFunction = new NodejsFunction(this, 'PredictTitle', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/predictTitle.ts',
      timeout: Duration.minutes(15),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
      environment: getBaseEnvironment(this, props, {
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        ...(guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: guardrailIdentify }
          : {}),
        ...(guardrailVersion ? { GUARDRAIL_VERSION: guardrailVersion } : {}),
      }),
    });
    table.grantWriteData(predictTitleFunction);

    const predictResource = api.root.addResource('predict');

    // POST: /predict
    predictResource.addMethod(
      'POST',
      new LambdaIntegration(predictFunction),
      commonAuthorizerProps
    );

    // POST: /predict/title
    const predictTitleResource = predictResource.addResource('title');
    predictTitleResource.addMethod(
      'POST',
      new LambdaIntegration(predictTitleFunction),
      commonAuthorizerProps
    );

    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(predictStreamFunction);
      tenantManager.tenantsTable.grantReadData(predictFunction);
    }
    if (sagemakerPolicy) {
      predictFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
    }
    if (litellmProxy) {
      litellmProxy.grantInvokeUrl(predictStreamFunction);
      litellmProxy.grantInvokeUrl(predictFunction);
      litellmProxy.grantInvokeUrl(predictTitleFunction);
    }
    if (bedrockPolicy) {
      predictStreamFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      predictFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    }
    if (logsPolicy) {
      predictStreamFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(logsPolicy);
    }
    if (assumeRolePolicy) {
      predictStreamFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
    }
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(predictTitleFunction);
    }

    this.predictStreamFunction = predictStreamFunction;
  }
}

export default PredictApi;
