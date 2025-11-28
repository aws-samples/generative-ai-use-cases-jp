import { Stack, CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RequestAuthorizer,
  RestApi,
  ResponseType,
  Period,
  IdentitySource,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import {
  Agent,
  AgentMap,
  ModelConfiguration,
  SelfSignUpTenantMapEntry,
  HiddenUseCases,
} from 'generative-ai-use-cases';
import {
  BEDROCK_IMAGE_GEN_MODELS,
  BEDROCK_VIDEO_GEN_MODELS,
  BEDROCK_RERANKING_MODELS,
  BEDROCK_TEXT_MODELS,
} from '@generative-ai-use-cases/common';
import { LitellmProxyServer } from '../litellm-proxy-server';
import { TenantManager } from '../tenant-manager';
import { GenericApiProps } from './props';
import { getBaseEnvironment } from './util';
import { LAMBDA_RUNTIME_NODEJS } from '../../../consts';
import PredictApi from './predict';
import OptimizePromptApi from './optimize-prompt';
import InvokeFlowApi from './invoke-flow';
import ChatApi from './chats';
import ImageApi from './image';
import TokenUsageApi from './token-usage';
import VideoApi from './video';
import WebTextApi from './web-text';
import FileApi from './file';
import FileBucket from '../file-bucket';
import ShareApi from './share';
import AdminApi from './admin';
import { CentralPptxApi } from './central-pptx';

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
  readonly assistantCreationRequiresAdmin: boolean;
  readonly customAgents: Agent[];
  readonly crossAccountBedrockRoleArn?: string | null;
  readonly allowedIpV4AddressRanges?: string[] | null;
  readonly allowedIpV6AddressRanges?: string[] | null;
  readonly litellmEndpoint?: string | null;
  readonly litellmProxy?: LitellmProxyServer | null;
  readonly pptxEnabled: boolean;
  readonly environment: string;
  readonly selfSignUpTenantMap?: SelfSignUpTenantMapEntry[] | null;

  // Resource
  readonly userPool: UserPool;
  readonly idPool: IdentityPool;
  readonly userPoolClient: UserPoolClient;
  readonly table: Table;
  readonly statsTable: Table;
  readonly assistantTable: Table;
  readonly knowledgeBaseId?: string;
  readonly agents?: Agent[];
  readonly guardrailIdentify?: string;
  readonly guardrailVersion?: string;
  // Tenant Management
  readonly tenantManager?: TenantManager;
  // PPTX resources moved to per-tenant stacks (no longer in control plane)

  // LangChain Credentials
  readonly openai?: {
    readonly apiKey: string; // OPENAI_API_KEY
  };
}

export class Api extends Construct {
  readonly restApi: RestApi;
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
  readonly centralPptxApi?: CentralPptxApi;

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
      rerankingModelId,
      tenantManager,
    } = props;

    const agents: Agent[] = [...(props.agents ?? []), ...props.customAgents];

    // Create Lambda Request Authorizer function
    const authorizerFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      entry: path.join(__dirname, '../../../lambda/authorizer.ts'),
      handler: 'handler',
      runtime: LAMBDA_RUNTIME_NODEJS,
      timeout: Duration.seconds(10),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        TENANTS_TABLE_NAME: tenantManager?.tenantsTable.tableName || '',
      },
      bundling: {
        externalModules: ['aws-sdk'],
      },
    });

    // Grant read access to Tenants table
    if (tenantManager) {
      tenantManager.tenantsTable.grantReadData(authorizerFunction);
    }

    // API Gateway Lambda Request Authorizer
    const authorizer = new RequestAuthorizer(this, 'Authorizer', {
      handler: authorizerFunction,
      identitySources: [IdentitySource.header('Authorization')],
      resultsCacheTtl: Duration.seconds(0), // Temporarily disabled cache to test
      authorizerName: 'TenantIpAuthorizer',
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.CUSTOM,
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

    const fileBucket = new FileBucket(this, 'FileBucket', {});

    // Agent Map
    const agentMap: AgentMap = {};
    for (const agent of agents) {
      agentMap[agent.displayName] = {
        agentId: agent.agentId,
        aliasId: agent.aliasId,
      };
    }

    const apiProps: GenericApiProps = {
      ...props,
      api: api,
      fileBucket: fileBucket.fileBucket,
      commonAuthorizerProps: commonAuthorizerProps,
      agentMap: agentMap,
    };

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

    // If SageMaker Endpoint exists, grant permission
    if (endpointNames.length > 0) {
      // SageMaker Policy
      const sagemakerPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeEndpoint', 'sagemaker:InvokeEndpoint'],
        resources: endpointNames.map(
          (endpointName) =>
            `arn:aws:sagemaker:${modelRegion}:${
              Stack.of(this).account
            }:endpoint/${endpointName}`
        ),
      });
      apiProps.sagemakerPolicy = sagemakerPolicy;
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
      apiProps.bedrockPolicy = bedrockPolicy;
    } else {
      // Policy for when crossAccountBedrockRoleArn is specified
      const logsPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:*'],
        resources: ['*'],
      });
      apiProps.logsPolicy = logsPolicy;

      const assumeRolePolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [crossAccountBedrockRoleArn],
      });
      apiProps.assumeRolePolicy = assumeRolePolicy;
    }

    // Note: Tenant-specific API routes have been removed as the unified approach
    // handles multi-tenancy through existing Lambda functions with AssumeRoleWithWebIdentity

    // POST: /tenant-registration (API key protected for tenant self-registration)
    // Only create if tenantManager is provided
    if (tenantManager) {
      const tenantRegistrationResource = api.root.addResource(
        'tenant-registration'
      );
      tenantRegistrationResource.addMethod(
        'POST',
        new LambdaIntegration(tenantManager.registrationLambda),
        {
          authorizationType: AuthorizationType.NONE,
          apiKeyRequired: true,
        }
      );

      // Create API key for tenant registration
      const tenantRegistrationApiKey = api.addApiKey(
        'TenantRegistrationApiKey',
        {
          apiKeyName: `tenant-registration-key-${props.environment}`,
          description: 'API key for tenant self-registration',
        }
      );

      // Create usage plan with rate limiting
      const tenantRegistrationUsagePlan = api.addUsagePlan(
        'TenantRegistrationUsagePlan',
        {
          name: `tenant-registration-plan-${props.environment}`,
          throttle: {
            rateLimit: 10, // 10 requests per second
            burstLimit: 20, // Burst of 20 requests
          },
          quota: {
            limit: 1000, // 1000 requests per month
            period: Period.MONTH,
          },
        }
      );

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

    // Tenant-aware use case configuration endpoint
    const getTenantAwareUseCaseConfigFunction = new NodejsFunction(
      this,
      'GetTenantAwareUseCaseConfig',
      {
        runtime: LAMBDA_RUNTIME_NODEJS,
        entry: './lambda/getTenantAwareUseCaseConfig.ts',
        timeout: Duration.minutes(2),
        bundling: {
          nodeModules: ['aws-jwt-verify'],
        },
        environment: getBaseEnvironment(this, apiProps, {
          ASSISTANT_CREATION_REQUIRES_ADMIN: (
            props.assistantCreationRequiresAdmin ?? true
          ).toString(),
        }),
      }
    );

    // Grant DynamoDB permissions for tenant data access
    if (tenantManager?.tenantsTable) {
      tenantManager.tenantsTable.grantReadData(
        getTenantAwareUseCaseConfigFunction
      );
    }

    // Add endpoint for tenant-aware use case configuration
    const tenantConfigResource = api.root.addResource('tenant-use-case-config');
    tenantConfigResource.addMethod(
      'GET',
      new LambdaIntegration(getTenantAwareUseCaseConfigFunction),
      commonAuthorizerProps
    );

    new ChatApi(this, 'ChatsAPI', apiProps);
    const fileApi = new FileApi(this, 'FileAPI', apiProps);
    new ImageApi(this, 'ImageAPI', apiProps);
    const invokeFlowApi = new InvokeFlowApi(this, 'InvokeFlowAPI', apiProps);
    const optimizePromptApi = new OptimizePromptApi(
      this,
      'OptimizePromptAPI',
      apiProps
    );
    const predictApi = new PredictApi(this, 'PredictAPI', apiProps);
    new ShareApi(this, 'ShareAPI', apiProps);
    new TokenUsageApi(this, 'TokenUsageAPI', apiProps);
    new VideoApi(this, 'VideoAPI', apiProps);
    new WebTextApi(this, 'WebTextAPI', apiProps);
    new AdminApi(this, 'AdminAPI', apiProps);

    // Central PPTX API for multi-tenant architecture
    // Lambda functions dynamically access tenant-specific resources based on Cognito claims
    if (props.pptxEnabled) {
      this.centralPptxApi = new CentralPptxApi(
        this,
        'CentralPptxAPI',
        apiProps
      );
    }

    // Assistant API is now created in AssistantApiStack (nested stack)
    // to reduce main stack resource count and improve deployment performance

    // Add ALL methods proxy to Bedrock Chat proxy Lambda
    this.restApi = api;
    this.predictStreamFunction = predictApi.predictStreamFunction;
    this.invokeFlowFunction = invokeFlowApi.invokeFlowFunction;
    this.optimizePromptFunction = optimizePromptApi.optimizePromptFunction;
    this.modelRegion = modelRegion;
    this.modelIds = modelIds;
    this.imageGenerationModelIds = imageGenerationModelIds;
    this.videoGenerationModelIds = videoGenerationModelIds;
    this.endpointNames = endpointNames;
    this.agentNames = Object.keys(agentMap);
    this.fileBucket = fileBucket.fileBucket;
    this.getFileDownloadSignedUrlFunction =
      fileApi.getFileDownloadSignedUrlFunction;
  }
}
