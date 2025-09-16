import { Stack, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
  ResponseType,
  Period,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3';
import { Agent, AgentMap, ModelConfiguration } from 'generative-ai-use-cases';
import {
  BEDROCK_IMAGE_GEN_MODELS,
  BEDROCK_VIDEO_GEN_MODELS,
  BEDROCK_RERANKING_MODELS,
  BEDROCK_TEXT_MODELS,
} from '@generative-ai-use-cases/common';
import { allowS3AccessWithSourceIpCondition } from '../utils/s3-access-policy';
import { LAMBDA_RUNTIME_NODEJS, DEFAULT_TENANT_ID } from '../../consts';
import { LitellmProxyServer } from './litellm-proxy-server';
import { TenantManager } from './tenant-manager';

export interface BackendApiProps {
  // Context Params
  readonly modelRegion: string;
  readonly modelIds: ModelConfiguration[];
  readonly imageGenerationModelIds: ModelConfiguration[];
  readonly videoGenerationModelIds: ModelConfiguration[];
  readonly videoBucketRegionMap: Record<string, string>;
  readonly endpointNames: string[];
  readonly queryDecompositionEnabled: boolean;
  readonly rerankingModelId?: string | null;
  readonly customAgents: Agent[];
  readonly crossAccountBedrockRoleArn?: string | null;
  readonly allowedIpV4AddressRanges?: string[] | null;
  readonly allowedIpV6AddressRanges?: string[] | null;
  readonly litellmEndpoint?: string | null;
  readonly litellmProxy?: LitellmProxyServer | null;
  readonly environment: string;

  // Resource
  readonly userPool: UserPool;
  readonly idPool: IdentityPool;
  readonly userPoolClient: UserPoolClient;
  readonly table: Table;
  readonly statsTable: Table;
  readonly knowledgeBaseId?: string;
  readonly agents?: Agent[];
  readonly guardrailIdentify?: string;
  readonly guardrailVersion?: string;
  // Tenant Management
  readonly tenantManager?: TenantManager;

  // LangChain Credentials
  readonly openai?: {
    readonly apiKey: string; // OPENAI_API_KEY
  };
}

export class Api extends Construct {
  readonly api: RestApi;
  readonly predictStreamFunction: NodejsFunction;
  readonly invokeFlowFunction: NodejsFunction;
  readonly optimizePromptFunction: NodejsFunction;
  readonly modelRegion: string;
  readonly modelIds: ModelConfiguration[];
  readonly imageGenerationModelIds: ModelConfiguration[];
  readonly videoGenerationModelIds: ModelConfiguration[];
  readonly endpointNames: string[];
  readonly agentNames: string[];
  readonly fileBucket: Bucket;
  readonly getFileDownloadSignedUrlFunction: IFunction;

  constructor(scope: Construct, id: string, props: BackendApiProps) {
    super(scope, id);

    const {
      modelRegion,
      modelIds,
      imageGenerationModelIds,
      videoGenerationModelIds,
      endpointNames,
      crossAccountBedrockRoleArn,
      userPool,
      userPoolClient,
      table,
      idPool,
      knowledgeBaseId,
      queryDecompositionEnabled,
      rerankingModelId,
      litellmEndpoint,
    } = props;
    const agents: Agent[] = [...(props.agents ?? []), ...props.customAgents];

    // Helper function to generate consistent environment variables for Lambda functions
    const getBaseEnvironment = (additionalEnvVars: Record<string, string> = {}) => ({
      TABLE_NAME: TABLE_PREFIX,
      DEFAULT_TABLE_NAME: props.table.tableName,
      DEFAULT_TENANT_ID: DEFAULT_TENANT_ID,
      ENVIRONMENT: props.environment || 'dev',
      IDENTITY_POOL_ID: props.idPool.identityPoolId,
      USER_POOL_ID: props.userPool.userPoolId,
      AWS_ACCOUNT_ID: Stack.of(this).account!,
      ...(props.tenantManager ? {
        TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
      } : {}),
      ...additionalEnvVars,
    });


    // Validate Model Names
    for (const model of modelIds) {
      if (!BEDROCK_TEXT_MODELS.includes(model.modelId)) {
        throw new Error(`Unsupported Model Name: ${model.modelId}`);
      }
    }
    for (const model of imageGenerationModelIds) {
      if (!BEDROCK_IMAGE_GEN_MODELS.includes(model.modelId)) {
        throw new Error(`Unsupported Model Name: ${model.modelId}`);
      }
    }
    for (const model of videoGenerationModelIds) {
      if (!BEDROCK_VIDEO_GEN_MODELS.includes(model.modelId)) {
        throw new Error(`Unsupported Model Name: ${model.modelId}`);
      }
    }
    if (
      rerankingModelId &&
      !BEDROCK_RERANKING_MODELS.includes(rerankingModelId)
    ) {
      throw new Error(`Unsupported Model Name: ${rerankingModelId}`);
    }

    // We don't support using the same model ID accross multiple regions
    const duplicateModelIds = new Set(
      [...modelIds, ...imageGenerationModelIds, ...videoGenerationModelIds]
        .map((m) => m.modelId)
        .filter((item, index, arr) => arr.indexOf(item) !== index)
    );
    if (duplicateModelIds.size > 0) {
      throw new Error(
        'Duplicate model IDs detected. Using the same model ID multiple times is not supported:\n' +
        [...duplicateModelIds].map((s) => `- ${s}\n`).join('\n')
      );
    }

    // Agent Map
    const agentMap: AgentMap = {};
    for (const agent of agents) {
      agentMap[agent.displayName] = {
        agentId: agent.agentId,
        aliasId: agent.aliasId,
      };
    }

    // Table name prefixes for constructing tenant-specific table names
    const TABLE_PREFIX = 'ChatHistory';
    const STATS_TABLE_PREFIX = 'TokenUsageStats';

    // S3 (File Bucket)
    const fileBucket = new Bucket(this, 'FileBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    fileBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
      allowedHeaders: ['*'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    // Lambda
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
        ...(props.guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify }
          : {}),
        ...(props.guardrailVersion
          ? { GUARDRAIL_VERSION: props.guardrailVersion }
          : {}),

        // LangChain Credentials
        OPENAI_API_KEY: props.openai?.apiKey ?? '',
        
        // Tenant Management Environment Variables
        ...(props.tenantManager ? {
          TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
        } : {}),
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
        ...(props.guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify }
          : {}),
        ...(props.guardrailVersion
          ? { GUARDRAIL_VERSION: props.guardrailVersion }
          : {}),
        QUERY_DECOMPOSITION_ENABLED: JSON.stringify(queryDecompositionEnabled),
        RERANKING_MODEL_ID: rerankingModelId ?? '',
        LITELLM_ENDPOINT: litellmEndpoint ?? '',

        // LangChain Credentials
        OPENAI_API_KEY: props.openai?.apiKey ?? '',
        
        // Tenant Management Environment Variables
        ...(props.tenantManager ? {
          TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
        } : {}),
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
    
    // Grant tenants table read access if tenant manager is available
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(predictStreamFunction);
      props.tenantManager.tenantsTable.grantReadData(predictFunction);
    }

    // Add Flow Lambda Function
    const invokeFlowFunction = new NodejsFunction(this, 'InvokeFlow', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/invokeFlow.ts',
      timeout: Duration.minutes(15),
      bundling: {
        nodeModules: [
          '@aws-sdk/client-bedrock-runtime',
          '@aws-sdk/client-bedrock-agent-runtime',
        ],
      },
      environment: {
        MODEL_REGION: modelRegion,
        
        // Tenant Management Environment Variables
        ...(props.tenantManager ? {
          TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
        } : {}),
      },
    });
    invokeFlowFunction.grantInvoke(idPool.authenticatedRole);
    
    // Grant tenants table read access if tenant manager is available
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(invokeFlowFunction);
    }

    const predictTitleFunction = new NodejsFunction(this, 'PredictTitle', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/predictTitle.ts',
      timeout: Duration.minutes(15),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
      environment: getBaseEnvironment({
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        ...(props.guardrailIdentify
          ? { GUARDRAIL_IDENTIFIER: props.guardrailIdentify }
          : {}),
        ...(props.guardrailVersion
          ? { GUARDRAIL_VERSION: props.guardrailVersion }
          : {}),
      }),
    });
    table.grantWriteData(predictTitleFunction);

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
        ...(props.tenantManager ? {
          TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
        } : {}),
      },
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    
    // Grant tenants table read access if tenant manager is available
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(generateImageFunction);
    }

    const generateVideoFunction = new NodejsFunction(this, 'GenerateVideo', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/generateVideo.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment({
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        VIDEO_BUCKET_OWNER: Stack.of(this).account,
        VIDEO_BUCKET_REGION_MAP: JSON.stringify(props.videoBucketRegionMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
        LITELLM_ENDPOINT: litellmEndpoint ?? '',
      }),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    for (const region of Object.keys(props.videoBucketRegionMap)) {
      const bucketName = props.videoBucketRegionMap[region];
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
      environment: getBaseEnvironment({
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        VIDEO_BUCKET_REGION_MAP: JSON.stringify(props.videoBucketRegionMap),
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
        BUCKET_NAME: fileBucket.bucketName,
      }),
      bundling: {
        nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    for (const region of Object.keys(props.videoBucketRegionMap)) {
      const bucketName = props.videoBucketRegionMap[region];
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
      environment: getBaseEnvironment({
        MODEL_REGION: modelRegion,
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
        VIDEO_BUCKET_REGION_MAP: JSON.stringify(props.videoBucketRegionMap),
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
      environment: getBaseEnvironment({
        MODEL_IDS: JSON.stringify(modelIds),
        IMAGE_GENERATION_MODEL_IDS: JSON.stringify(imageGenerationModelIds),
        VIDEO_GENERATION_MODEL_IDS: JSON.stringify(videoGenerationModelIds),
      }),
    });
    table.grantWriteData(deleteVideoJob);

    const optimizePromptFunction = new NodejsFunction(
      this,
      'OptimizePromptFunction',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/optimizePrompt.ts',
        timeout: Duration.minutes(15),
        bundling: {
          nodeModules: ['@aws-sdk/client-bedrock-agent-runtime'],
        },
        environment: {
          MODEL_REGION: modelRegion,
        },
      }
    );
    optimizePromptFunction.grantInvoke(idPool.authenticatedRole);

    const getSignedUrlFunction = new NodejsFunction(this, 'GetSignedUrl', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getFileUploadSignedUrl.ts',
      timeout: Duration.minutes(15),
      bundling: {
        nodeModules: ['aws-jwt-verify'],
      },
      environment: getBaseEnvironment({
        BUCKET_NAME: fileBucket.bucketName,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      }),
    });
    // Grant S3 write permissions with source IP condition
    if (getSignedUrlFunction.role) {
      allowS3AccessWithSourceIpCondition(
        fileBucket.bucketName,
        getSignedUrlFunction.role,
        'write',
        {
          ipv4: props.allowedIpV4AddressRanges,
          ipv6: props.allowedIpV6AddressRanges,
        }
      );
    }

    const getFileDownloadSignedUrlFunction = new NodejsFunction(
      this,
      'GetFileDownloadSignedUrlFunction',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/getFileDownloadSignedUrl.ts',
        timeout: Duration.minutes(15),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment({
          CROSS_ACCOUNT_BEDROCK_ROLE_ARN: crossAccountBedrockRoleArn ?? '',
          BUCKET_NAME: fileBucket.bucketName,
          USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        }),
      }
    );
    // Grant S3 read permissions with source IP condition
    if (getFileDownloadSignedUrlFunction.role) {
      allowS3AccessWithSourceIpCondition(
        fileBucket.bucketName,
        getFileDownloadSignedUrlFunction.role,
        'read',
        {
          ipv4: props.allowedIpV4AddressRanges,
          ipv6: props.allowedIpV6AddressRanges,
        }
      );
    }

    // If SageMaker Endpoint exists, grant permission
    if (endpointNames.length > 0) {
      // SageMaker Policy
      const sagemakerPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeEndpoint', 'sagemaker:InvokeEndpoint'],
        resources: endpointNames.map(
          (endpointName) =>
            `arn:aws:sagemaker:${modelRegion}:${Stack.of(this).account
            }:endpoint/${endpointName}`
        ),
      });
      predictFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      generateVideoFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
      listVideoJobs.role?.addToPrincipalPolicy(sagemakerPolicy);
      invokeFlowFunction.role?.addToPrincipalPolicy(sagemakerPolicy);
    }

    // Grant permissions to access LiteLLM proxy if it's enabled
    if (props.litellmProxy) {
      props.litellmProxy.grantInvokeUrl(predictStreamFunction);
      props.litellmProxy.grantInvokeUrl(predictFunction);
      props.litellmProxy.grantInvokeUrl(predictTitleFunction);
      props.litellmProxy.grantInvokeUrl(generateImageFunction);
      props.litellmProxy.grantInvokeUrl(generateVideoFunction);
      props.litellmProxy.grantInvokeUrl(listVideoJobs);
      props.litellmProxy.grantInvokeUrl(invokeFlowFunction);
    }

    // Bedrock is always granted permission
    // Bedrock Policy
    if (
      typeof crossAccountBedrockRoleArn !== 'string' ||
      crossAccountBedrockRoleArn === ''
    ) {
      const bedrockPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:*', 'logs:*'],
      });
      predictStreamFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      predictFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      generateVideoFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      listVideoJobs.role?.addToPrincipalPolicy(bedrockPolicy);
      invokeFlowFunction.role?.addToPrincipalPolicy(bedrockPolicy);
      optimizePromptFunction.role?.addToPrincipalPolicy(bedrockPolicy);
    } else {
      // Policy for when crossAccountBedrockRoleArn is specified
      const logsPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:*'],
        resources: ['*'],
      });
      const assumeRolePolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [crossAccountBedrockRoleArn],
      });
      predictStreamFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictFunction.role?.addToPrincipalPolicy(logsPolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(logsPolicy);
      generateImageFunction.role?.addToPrincipalPolicy(logsPolicy);
      generateVideoFunction.role?.addToPrincipalPolicy(logsPolicy);
      listVideoJobs.role?.addToPrincipalPolicy(logsPolicy);
      predictStreamFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      predictTitleFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      generateImageFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      generateVideoFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
      listVideoJobs.role?.addToPrincipalPolicy(assumeRolePolicy);
      // To get pre-signed URL from S3 in different account
      getFileDownloadSignedUrlFunction.role?.addToPrincipalPolicy(
        assumeRolePolicy
      );
    }

    const createChatFunction = new NodejsFunction(this, 'CreateChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createChat.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantWriteData(createChatFunction);

    const deleteChatFunction = new NodejsFunction(this, 'DeleteChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteChat.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadWriteData(deleteChatFunction);

    const createMessagesFunction = new NodejsFunction(this, 'CreateMessages', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createMessages.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment({
        STATS_TABLE_NAME: STATS_TABLE_PREFIX,
        DEFAULT_STATS_TABLE_NAME: props.statsTable.tableName,
        BUCKET_NAME: fileBucket.bucketName,
        CHAT_BUCKET_BASE: 'chat',
        DOCS_BUCKET_BASE: 'docs',
        CDK_ACCOUNT_ID: Stack.of(this).account!,
      }),
    });
    table.grantReadWriteData(createMessagesFunction);
    props.statsTable.grantReadWriteData(createMessagesFunction);

    const updateChatTitleFunction = new NodejsFunction(
      this,
      'UpdateChatTitle',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/updateTitle.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(),
      }
    );
    table.grantReadWriteData(updateChatTitleFunction);

    const listChatsFunction = new NodejsFunction(this, 'ListChats', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listChats.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment({
        STATS_TABLE_NAME: STATS_TABLE_PREFIX,
        DEFAULT_STATS_TABLE_NAME: props.statsTable.tableName,
      }),
    });
    table.grantReadData(listChatsFunction);

    const findChatbyIdFunction = new NodejsFunction(this, 'FindChatbyId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/findChatById.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadData(findChatbyIdFunction);

    const listMessagesFunction = new NodejsFunction(this, 'ListMessages', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/listMessages.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadData(listMessagesFunction);

    const updateFeedbackFunction = new NodejsFunction(this, 'UpdateFeedback', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/updateFeedback.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadWriteData(updateFeedbackFunction);

    const getWebTextFunction = new NodejsFunction(this, 'GetWebText', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getWebText.ts',
      timeout: Duration.minutes(15),
    });

    const createShareId = new NodejsFunction(this, 'CreateShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/createShareId.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadWriteData(createShareId);

    const getSharedChat = new NodejsFunction(this, 'GetSharedChat', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getSharedChat.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadData(getSharedChat);

    const findShareId = new NodejsFunction(this, 'FindShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/findShareId.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadData(findShareId);

    const deleteShareId = new NodejsFunction(this, 'DeleteShareId', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteShareId.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment(),
    });
    table.grantReadWriteData(deleteShareId);

    const listSystemContextsFunction = new NodejsFunction(
      this,
      'ListSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/listSystemContexts.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(),
      }
    );
    table.grantReadData(listSystemContextsFunction);

    const createSystemContextFunction = new NodejsFunction(
      this,
      'CreateSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/createSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(),
      }
    );
    table.grantWriteData(createSystemContextFunction);

    const updateSystemContextTitleFunction = new NodejsFunction(
      this,
      'UpdateSystemContextTitle',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/updateSystemContextTitle.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(),
      }
    );
    table.grantReadWriteData(updateSystemContextTitleFunction);

    const deleteSystemContextFunction = new NodejsFunction(
      this,
      'DeleteSystemContexts',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/deleteSystemContext.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment(),
      }
    );
    table.grantReadWriteData(deleteSystemContextFunction);

    const deleteFileFunction = new NodejsFunction(this, 'DeleteFileFunction', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/deleteFile.ts',
      timeout: Duration.minutes(15),
      environment: getBaseEnvironment({
        BUCKET_NAME: fileBucket.bucketName,
      }),
    });
    fileBucket.grantDelete(deleteFileFunction);

    // Lambda function for getting token usage
    const getTokenUsageFunction = new NodejsFunction(this, 'GetTokenUsage', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/getTokenUsage.ts',
      environment: getBaseEnvironment({
        STATS_TABLE_NAME: STATS_TABLE_PREFIX,
        DEFAULT_STATS_TABLE_NAME: props.statsTable.tableName,
      }),
    });
    table.grantReadData(getTokenUsageFunction);
    props.statsTable.grantReadData(getTokenUsageFunction);

    // Note: The unified multi-tenant approach handles AssumeRoleWithWebIdentity
    // directly within each Lambda function, so separate Lambda functions for
    // tenant operations are no longer needed.

    // Grant tenants table read access to all Lambda functions that need to access DynamoDB/S3
    // This is required because getTenantCredentials() now reads tenant metadata from the tenants table
    if (props.tenantManager) {
      // Chat-related functions
      props.tenantManager.tenantsTable.grantReadData(createChatFunction);
      props.tenantManager.tenantsTable.grantReadData(deleteChatFunction);
      props.tenantManager.tenantsTable.grantReadData(createMessagesFunction);
      props.tenantManager.tenantsTable.grantReadData(updateChatTitleFunction);
      props.tenantManager.tenantsTable.grantReadData(listChatsFunction);
      props.tenantManager.tenantsTable.grantReadData(findChatbyIdFunction);
      props.tenantManager.tenantsTable.grantReadData(listMessagesFunction);
      props.tenantManager.tenantsTable.grantReadData(updateFeedbackFunction);
      props.tenantManager.tenantsTable.grantReadData(predictTitleFunction);
      
      // Share-related functions
      props.tenantManager.tenantsTable.grantReadData(createShareId);
      props.tenantManager.tenantsTable.grantReadData(getSharedChat);
      props.tenantManager.tenantsTable.grantReadData(findShareId);
      props.tenantManager.tenantsTable.grantReadData(deleteShareId);
      
      // System context functions
      props.tenantManager.tenantsTable.grantReadData(listSystemContextsFunction);
      props.tenantManager.tenantsTable.grantReadData(createSystemContextFunction);
      props.tenantManager.tenantsTable.grantReadData(updateSystemContextTitleFunction);
      props.tenantManager.tenantsTable.grantReadData(deleteSystemContextFunction);
      
      // Video-related functions
      props.tenantManager.tenantsTable.grantReadData(generateVideoFunction);
      props.tenantManager.tenantsTable.grantReadData(copyVideoJob);
      props.tenantManager.tenantsTable.grantReadData(listVideoJobs);
      props.tenantManager.tenantsTable.grantReadData(deleteVideoJob);
      
      // File operations (for S3 cross-account access)
      props.tenantManager.tenantsTable.grantReadData(deleteFileFunction);
      props.tenantManager.tenantsTable.grantReadData(getSignedUrlFunction);
      props.tenantManager.tenantsTable.grantReadData(getFileDownloadSignedUrlFunction);
      
      // Token usage
      props.tenantManager.tenantsTable.grantReadData(getTokenUsageFunction);
    }

    // API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    const api = new RestApi(this, 'Api', {
      deployOptions: {
        stageName: 'api',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      cloudWatchRole: true,
      defaultMethodOptions: commonAuthorizerProps,
    });

    api.addGatewayResponse('Api4XX', {
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    api.addGatewayResponse('Api5XX', {
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    // Note: Tenant-specific API routes have been removed as the unified approach
    // handles multi-tenancy through existing Lambda functions with AssumeRoleWithWebIdentity

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

    const chatsResource = api.root.addResource('chats');

    // POST: /chats
    chatsResource.addMethod(
      'POST',
      new LambdaIntegration(createChatFunction),
      commonAuthorizerProps
    );

    // GET: /chats
    chatsResource.addMethod(
      'GET',
      new LambdaIntegration(listChatsFunction),
      commonAuthorizerProps
    );

    const chatResource = chatsResource.addResource('{chatId}');

    // GET: /chats/{chatId}
    chatResource.addMethod(
      'GET',
      new LambdaIntegration(findChatbyIdFunction),
      commonAuthorizerProps
    );

    // DELETE: /chats/{chatId}
    chatResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteChatFunction),
      commonAuthorizerProps
    );

    const titleResource = chatResource.addResource('title');

    // PUT: /chats/{chatId}/title
    titleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateChatTitleFunction),
      commonAuthorizerProps
    );

    const messagesResource = chatResource.addResource('messages');

    // GET: /chats/{chatId}/messages
    messagesResource.addMethod(
      'GET',
      new LambdaIntegration(listMessagesFunction),
      commonAuthorizerProps
    );

    // POST: /chats/{chatId}/messages
    messagesResource.addMethod(
      'POST',
      new LambdaIntegration(createMessagesFunction),
      commonAuthorizerProps
    );

    const systemContextsResource = api.root.addResource('systemcontexts');

    // POST: /systemcontexts
    systemContextsResource.addMethod(
      'POST',
      new LambdaIntegration(createSystemContextFunction),
      commonAuthorizerProps
    );

    // GET: /systemcontexts
    systemContextsResource.addMethod(
      'GET',
      new LambdaIntegration(listSystemContextsFunction),
      commonAuthorizerProps
    );

    const systemContextResource =
      systemContextsResource.addResource('{systemContextId}');

    // DELETE: /systemcontexts/{systemContextId}
    systemContextResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteSystemContextFunction),
      commonAuthorizerProps
    );

    const systemContextTitleResource =
      systemContextResource.addResource('title');

    // PUT: /systemcontexts/{systemContextId}/title
    systemContextTitleResource.addMethod(
      'PUT',
      new LambdaIntegration(updateSystemContextTitleFunction),
      commonAuthorizerProps
    );

    const feedbacksResource = chatResource.addResource('feedbacks');

    // POST: /chats/{chatId}/feedbacks
    feedbacksResource.addMethod(
      'POST',
      new LambdaIntegration(updateFeedbackFunction),
      commonAuthorizerProps
    );

    const imageResource = api.root.addResource('image');
    const imageGenerateResource = imageResource.addResource('generate');
    // POST: /image/generate
    imageGenerateResource.addMethod(
      'POST',
      new LambdaIntegration(generateImageFunction),
      commonAuthorizerProps
    );

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

    // Used in the web content extraction use case
    const webTextResource = api.root.addResource('web-text');
    // GET: /web-text
    webTextResource.addMethod(
      'GET',
      new LambdaIntegration(getWebTextFunction),
      commonAuthorizerProps
    );

    const shareResource = api.root.addResource('shares');
    const shareChatIdResource = shareResource
      .addResource('chat')
      .addResource('{chatId}');
    // GET: /shares/chat/{chatId}
    shareChatIdResource.addMethod(
      'GET',
      new LambdaIntegration(findShareId),
      commonAuthorizerProps
    );
    // POST: /shares/chat/{chatId}
    shareChatIdResource.addMethod(
      'POST',
      new LambdaIntegration(createShareId),
      commonAuthorizerProps
    );
    const shareShareIdResource = shareResource
      .addResource('share')
      .addResource('{shareId}');
    // GET: /shares/share/{shareId}
    shareShareIdResource.addMethod(
      'GET',
      new LambdaIntegration(getSharedChat),
      commonAuthorizerProps
    );
    // DELETE: /shares/share/{shareId}
    shareShareIdResource.addMethod(
      'DELETE',
      new LambdaIntegration(deleteShareId),
      commonAuthorizerProps
    );

    const fileResource = api.root.addResource('file');
    const urlResource = fileResource.addResource('url');
    // POST: /file/url
    urlResource.addMethod(
      'POST',
      new LambdaIntegration(getSignedUrlFunction),
      commonAuthorizerProps
    );
    // Get: /file/url
    urlResource.addMethod(
      'GET',
      new LambdaIntegration(getFileDownloadSignedUrlFunction),
      commonAuthorizerProps
    );
    // DELETE: /file/{fileName}
    fileResource
      .addResource('{fileName}')
      .addMethod(
        'DELETE',
        new LambdaIntegration(deleteFileFunction),
        commonAuthorizerProps
      );

    // GET: /token-usage
    const tokenUsageResource = api.root.addResource('token-usage');
    tokenUsageResource.addMethod(
      'GET',
      new LambdaIntegration(getTokenUsageFunction),
      commonAuthorizerProps
    );

    // POST: /tenant-registration (API key protected for tenant self-registration)
    // Only create if tenantManager is provided
    if (props.tenantManager) {
      const tenantRegistrationResource = api.root.addResource('tenant-registration');
      tenantRegistrationResource.addMethod(
        'POST',
        new LambdaIntegration(props.tenantManager.registrationLambda),
        {
          authorizationType: AuthorizationType.NONE,
          apiKeyRequired: true,
        }
      );

      // Create API key for tenant registration
      const tenantRegistrationApiKey = api.addApiKey('TenantRegistrationApiKey', {
        apiKeyName: `tenant-registration-key-${props.environment}`,
        description: 'API key for tenant self-registration',
      });

      // Create usage plan with rate limiting
      const tenantRegistrationUsagePlan = api.addUsagePlan('TenantRegistrationUsagePlan', {
        name: `tenant-registration-plan-${props.environment}`,
        throttle: {
          rateLimit: 10,    // 10 requests per second
          burstLimit: 20,   // Burst of 20 requests
        },
        quota: {
          limit: 1000,      // 1000 requests per month
          period: Period.MONTH,
        },
      });

      tenantRegistrationUsagePlan.addApiStage({
        stage: api.deploymentStage,
      });
      tenantRegistrationUsagePlan.addApiKey(tenantRegistrationApiKey);

      // Output the API endpoint and key for tenant configuration
      new CfnOutput(this, 'TenantRegistrationEndpoint', {
        value: `${api.url}tenant-registration`,
        description: 'API endpoint for tenant self-registration',
        exportName: `${Stack.of(this).stackName}-TenantRegEndpoint`,
      });

      new CfnOutput(this, 'TenantRegistrationApiKeyId', {
        value: tenantRegistrationApiKey.keyId,
        description: 'API key ID for tenant registration',
        exportName: `${Stack.of(this).stackName}-TenantRegApiKeyId`,
      });
    }

    const bedrockChatResource = api.root.addResource('bedrock-chat');
    const bedrockChatProxyResource = bedrockChatResource.addResource('{proxy+}');

    // Create proxy Lambda function for Bedrock Chat
    const bedrockChatProxyFunction = new NodejsFunction(
      this,
      'BedrockChatProxy',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/bedrock-chat-proxy.ts',
        timeout: Duration.minutes(15),
        environment: getBaseEnvironment({
          ENVIRONMENT: props.environment,
          ...(props.tenantManager ? {
            TENANTS_TABLE_NAME: props.tenantManager.tenantsTable.tableName,
          } : {}),
        }),
      }
    );

    // Grant permissions to invoke tenant Lambda functions
    bedrockChatProxyFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        // TODO: Restrict to specific tenant Lambda functions pattern
        // For now, allow invoking any Lambda in the account that matches the pattern
        resources: [
          `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:*-TenantBedrockChatStack-*`
        ],
      })
    );

    // Grant access to Tenants table if tenant manager exists
    if (props.tenantManager) {
      props.tenantManager.tenantsTable.grantReadData(bedrockChatProxyFunction);
    }

    // Add ALL methods proxy to Bedrock Chat proxy Lambda
    bedrockChatProxyResource.addMethod(
      'ANY',
      new LambdaIntegration(bedrockChatProxyFunction),
      commonAuthorizerProps
    );

    // Also handle direct /bedrock-chat endpoint
    bedrockChatResource.addMethod(
      'ANY',
      new LambdaIntegration(bedrockChatProxyFunction),
      commonAuthorizerProps
    );

    this.api = api;
    this.predictStreamFunction = predictStreamFunction;
    this.invokeFlowFunction = invokeFlowFunction;
    this.optimizePromptFunction = optimizePromptFunction;
    this.modelRegion = modelRegion;
    this.modelIds = modelIds;
    this.imageGenerationModelIds = imageGenerationModelIds;
    this.videoGenerationModelIds = videoGenerationModelIds;
    this.endpointNames = endpointNames;
    this.agentNames = Object.keys(agentMap);
    this.fileBucket = fileBucket;
    this.getFileDownloadSignedUrlFunction = getFileDownloadSignedUrlFunction;
  }
}
