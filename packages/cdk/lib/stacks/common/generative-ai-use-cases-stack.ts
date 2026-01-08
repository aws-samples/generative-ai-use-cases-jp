import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Auth,
  Api,
  Database,
  Rag,
  RagKnowledgeBase,
  CommonWebAcl,
  LitellmProxyServer,
  TenantManager,
} from '../../construct';
import { PptxDb } from '../../construct/pptx-db';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Agent } from 'generative-ai-use-cases';
import { UseCaseBuilderStack } from '../nested/use-case-builder-stack';
import { ProcessedStackInput } from '../../stack-input';
import { allowS3AccessWithSourceIpCondition } from '../../utils/s3-access-policy';
import { env } from 'process';
import { Buffer } from 'buffer';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import TranscribeStack from './transcribe-stack';
import WebStack from './web-stack';
import SpeechToSpeechStack from './speech-to-speech-stack';
import McpApiStack from './mcp-api-stack';
import AssistantApiStack from './assistant-api-stack';

export interface GenerativeAiUseCasesStackProps extends StackProps {
  readonly params: ProcessedStackInput;
  // RAG Knowledge Base
  readonly knowledgeBaseId?: string;
  readonly knowledgeBaseDataSourceBucketName?: string;
  // Agent
  readonly agents?: Agent[];
  // Video Generation
  readonly videoBucketRegionMap: Record<string, string>;
  // Guardrail
  readonly guardrailIdentifier?: string;
  readonly guardrailVersion?: string;
  // WAF
  readonly webAclId?: string;
  // Custom Domain
  readonly cert?: ICertificate;
  // Image build environment
  readonly isSageMakerStudio: boolean;
}

export class GenerativeAiUseCasesStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly idPool: IdentityPool;
  public readonly restApi: RestApi;
  public readonly tenantManager: TenantManager;

  constructor(
    scope: Construct,
    id: string,
    props: GenerativeAiUseCasesStackProps
  ) {
    super(scope, id, props);
    env.overrideWarningsEnabled = 'false';

    const params = props.params;

    // Auth
    const auth = new Auth(this, 'Auth', {
      selfSignUpEnabled: params.selfSignUpEnabled,
      allowedIpV4AddressRanges: params.allowedIpV4AddressRanges,
      allowedIpV6AddressRanges: params.allowedIpV6AddressRanges,
      selfSignUpTenantMap: params.selfSignUpTenantMap,
      samlAuthEnabled: params.samlAuthEnabled,
      samlDefaultAuthEnabled: params.samlDefaultAuthEnabled,
      emailServiceName: params.emailServiceName,
      sendgridApiKey: params.sendgridApiKey,
      sendgridFromEmail: params.sendgridFromEmail,
      enableAutoDelete: params.enableAutoDelete,
    });

    // Database
    const database = new Database(this, 'Database');

    // Tenant Management
    const tenantManager = new TenantManager(this, 'TenantManager', {
      environment: params.env,
      enableAutoDelete: params.enableAutoDelete,
    });

    // PPTX resources moved to per-tenant stacks (TenantPptxStack and TenantS3Stack)
    // Each tenant now has their own isolated PPTX database and S3 buckets

    // LiteLLM Proxy Server (must be created before API)
    let litellmEndpoint: string | null = null;
    let litellmProxy: LitellmProxyServer | null = null;
    if (params.litellmProxyEnabled) {
      litellmProxy = new LitellmProxyServer(this, 'LitellmProxyServer', {
        idPool: auth.idPool,
        isSageMakerStudio: props.isSageMakerStudio,
        modelRegion: params.modelRegion,
        crossAccountBedrockRoleArn:
          params.crossAccountBedrockRoleArn || undefined,
      });
      litellmEndpoint = litellmProxy.endpoint;
    }

    // API
    const api = new Api(this, 'API', {
      modelRegion: params.modelRegion,
      modelIds: params.modelIds,
      imageGenerationModelIds: params.imageGenerationModelIds,
      videoGenerationModelIds: params.videoGenerationModelIds,
      videoBucketRegionMap: props.videoBucketRegionMap,
      endpointNames: params.endpointNames,
      customAgents: params.agents,
      queryDecompositionEnabled: params.queryDecompositionEnabled,
      rerankingModelId: params.rerankingModelId,
      assistantCreationRequiresAdmin: params.assistantCreationRequiresAdmin,
      crossAccountBedrockRoleArn: params.crossAccountBedrockRoleArn,
      allowedIpV4AddressRanges: params.allowedIpV4AddressRanges,
      allowedIpV6AddressRanges: params.allowedIpV6AddressRanges,
      litellmEndpoint: litellmEndpoint,
      litellmProxy: litellmProxy,
      pptxEnabled: params.pptxEnabled,
      selfSignUpTenantMap: params.selfSignUpTenantMap,
      userPool: auth.userPool,
      idPool: auth.idPool,
      userPoolClient: auth.client,
      table: database.table,
      statsTable: database.statsTable,
      assistantTable: database.assistantTable,
      knowledgeBaseId: params.ragKnowledgeBaseId || props.knowledgeBaseId,
      agents: props.agents,
      guardrailIdentify: props.guardrailIdentifier,
      guardrailVersion: props.guardrailVersion,
      environment: params.env,
      tenantManager: tenantManager,
      // PPTX resources moved to per-tenant stacks - no longer in control plane

      // LangChain Credentials
      openai: params.openai,

      // Web Search
      searchApiKey: params.searchApiKey ?? undefined,
      searchEngine: params.searchEngine ?? undefined,
    });

    // WAF
    if (
      params.allowedIpV4AddressRanges ||
      params.allowedIpV6AddressRanges ||
      params.allowedCountryCodes
    ) {
      const regionalWaf = new CommonWebAcl(this, 'RegionalWaf', {
        scope: 'REGIONAL',
        allowedIpV4AddressRanges: params.allowedIpV4AddressRanges,
        allowedIpV6AddressRanges: params.allowedIpV6AddressRanges,
        allowedCountryCodes: params.allowedCountryCodes,
      });
      new CfnWebACLAssociation(this, 'ApiWafAssociation', {
        resourceArn: api.restApi.deploymentStage.stageArn,
        webAclArn: regionalWaf.webAclArn,
      });
      new CfnWebACLAssociation(this, 'UserPoolWafAssociation', {
        resourceArn: auth.userPool.userPoolArn,
        webAclArn: regionalWaf.webAclArn,
      });
    }

    // SpeechToSpeech (for bidirectional communication)
    const speechToSpeechStack = new SpeechToSpeechStack(
      this,
      'SpeechToSpeech',
      {
        params: params,
        api: api,
        auth: auth,
      }
    );
    const speechToSpeech = speechToSpeechStack.speechToSpeech;

    // Assistant API (moved to nested stack to reduce main stack resource count)
    const assistantApiStack = new AssistantApiStack(this, 'AssistantApi', {
      params: params,
      api: api,
      auth: auth,
      assistantTable: database.assistantTable,
      chatHistoryTable: database.table,
      fileBucket: api.fileBucket,
      tenantManager: tenantManager,
      videoBucketRegionMap: props.videoBucketRegionMap,
      guardrailIdentifier: props.guardrailIdentifier,
      guardrailVersion: props.guardrailVersion,
      litellmEndpoint: litellmEndpoint,
      litellmProxy: litellmProxy,
    });

    // MCP
    let mcpEndpoint: string | null = null;
    if (params.mcpEnabled) {
      const mcpApiStack = new McpApiStack(this, 'McpApi', {
        auth: auth,
        isSageMakerStudio: props.isSageMakerStudio,
        api: api,
      });

      mcpEndpoint = mcpApiStack.mcpApi.endpoint;
    }

    // Web Frontend (only deploy if useWebUi is true)
    if (params.useWebUi) {
      new WebStack(this, 'Web', {
        params: params,
        auth: auth,
        api: api,
        speechToSpeech: speechToSpeech,
        webAclId: props.webAclId,
        mcpEndpoint: mcpEndpoint,
        cert: props.cert,
        assistantMessageStreamFunctionArn:
          assistantApiStack.assistantApi.assistantMessageStreamFunction
            .functionArn,
      });
    }

    // RAG
    if (params.ragEnabled) {
      const rag = new Rag(this, 'Rag', {
        envSuffix: params.env,
        kendraIndexLanguage: params.kendraIndexLanguage,
        kendraIndexArnInCdkContext: params.kendraIndexArn,
        kendraDataSourceBucketName: params.kendraDataSourceBucketName,
        kendraIndexScheduleEnabled: params.kendraIndexScheduleEnabled,
        kendraIndexScheduleCreateCron: params.kendraIndexScheduleCreateCron,
        kendraIndexScheduleDeleteCron: params.kendraIndexScheduleDeleteCron,
        userPool: auth.userPool,
        api: api.restApi,
      });

      // Allow downloading files from the File API to the data source Bucket
      // If you are importing existing Kendra, there is a possibility that the data source is not S3
      // In that case, rag.dataSourceBucketName will be undefined and the permission will not be granted
      if (
        rag.dataSourceBucketName &&
        api.getFileDownloadSignedUrlFunction.role
      ) {
        allowS3AccessWithSourceIpCondition(
          rag.dataSourceBucketName,
          api.getFileDownloadSignedUrlFunction.role,
          'read',
          {
            ipv4: params.allowedIpV4AddressRanges,
            ipv6: params.allowedIpV6AddressRanges,
          }
        );
      }
    }

    // RAG Knowledge Base
    if (params.ragKnowledgeBaseEnabled) {
      const knowledgeBaseId =
        params.ragKnowledgeBaseId || props.knowledgeBaseId;
      if (knowledgeBaseId) {
        new RagKnowledgeBase(this, 'RagKnowledgeBase', {
          modelRegion: params.modelRegion,
          crossAccountBedrockRoleArn: params.crossAccountBedrockRoleArn,
          knowledgeBaseId: knowledgeBaseId,
          userPool: auth.userPool,
          api: api.restApi,
        });
        // Allow downloading files from the File API to the data source Bucket
        if (
          props.knowledgeBaseDataSourceBucketName &&
          api.getFileDownloadSignedUrlFunction.role
        ) {
          allowS3AccessWithSourceIpCondition(
            props.knowledgeBaseDataSourceBucketName,
            api.getFileDownloadSignedUrlFunction.role,
            'read',
            {
              ipv4: params.allowedIpV4AddressRanges,
              ipv6: params.allowedIpV6AddressRanges,
            }
          );
        }
      }
    }

    // Usecase builder (as Nested Stack)
    if (params.useCaseBuilderEnabled) {
      new UseCaseBuilderStack(this, `UseCaseBuilderStack${params.env}`, {
        userPool: auth.userPool,
        api: api.restApi,
        idPool: auth.idPool,
        environment: params.env,
        tenantManager: tenantManager,
      });
    }

    new TranscribeStack(this, `TranscribeStack${params.env}`, {
      env: {
        account: params.account,
        region: params.region,
      },
      params: params,
      userPool: auth.userPool,
      idPool: auth.idPool,
      restApi: api.restApi,
      tenantManager: tenantManager,
    });

    // Cfn Outputs
    new CfnOutput(this, 'Region', {
      value: this.region,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: api.restApi.url,
    });

    new CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });

    new CfnOutput(this, 'UserPoolClientId', {
      value: auth.client.userPoolClientId,
    });

    new CfnOutput(this, 'IdPoolId', { value: auth.idPool.identityPoolId });

    new CfnOutput(this, 'PredictStreamFunctionArn', {
      value: api.predictStreamFunction.functionArn,
    });

    new CfnOutput(this, 'OptimizePromptFunctionArn', {
      value: api.optimizePromptFunction.functionArn,
    });

    new CfnOutput(this, 'InvokeFlowFunctionArn', {
      value: api.invokeFlowFunction.functionArn,
    });

    new CfnOutput(this, 'AssistantMessageStreamFunctionArn', {
      value:
        assistantApiStack.assistantApi.assistantMessageStreamFunction
          .functionArn,
    });

    new CfnOutput(this, 'Flows', {
      value: Buffer.from(JSON.stringify(params.flows)).toString('base64'),
    });

    new CfnOutput(this, 'RagEnabled', {
      value: params.ragEnabled.toString(),
    });

    new CfnOutput(this, 'RagKnowledgeBaseEnabled', {
      value: params.ragKnowledgeBaseEnabled.toString(),
    });

    new CfnOutput(this, 'AgentEnabled', {
      value: (params.agentEnabled || params.agents.length > 0).toString(),
    });

    new CfnOutput(this, 'SelfSignUpEnabled', {
      value: params.selfSignUpEnabled.toString(),
    });

    new CfnOutput(this, 'ModelRegion', {
      value: api.modelRegion,
    });

    new CfnOutput(this, 'ModelIds', {
      value: JSON.stringify(api.modelIds),
    });

    new CfnOutput(this, 'ImageGenerateModelIds', {
      value: JSON.stringify(api.imageGenerationModelIds),
    });

    new CfnOutput(this, 'VideoGenerateModelIds', {
      value: JSON.stringify(api.videoGenerationModelIds),
    });

    new CfnOutput(this, 'EndpointNames', {
      value: JSON.stringify(api.endpointNames),
    });

    new CfnOutput(this, 'SamlAuthEnabled', {
      value: params.samlAuthEnabled.toString(),
    });

    new CfnOutput(this, 'SamlDefaultAuthEnabled', {
      value: params.samlDefaultAuthEnabled.toString(),
    });

    new CfnOutput(this, 'SamlCognitoDomainName', {
      value: params.samlCognitoDomainName ?? '',
    });

    new CfnOutput(this, 'SamlCognitoFederatedIdentityProviderName', {
      value: params.samlCognitoFederatedIdentityProviderName ?? '',
    });

    new CfnOutput(this, 'AgentNames', {
      value: Buffer.from(JSON.stringify(api.agentNames)).toString('base64'),
    });

    new CfnOutput(this, 'InlineAgents', {
      value: params.inlineAgents.toString(),
    });

    new CfnOutput(this, 'UseCaseBuilderEnabled', {
      value: params.useCaseBuilderEnabled.toString(),
    });

    new CfnOutput(this, 'SpeechToSpeechNamespace', {
      value: speechToSpeech.namespace,
    });

    new CfnOutput(this, 'SpeechToSpeechEventApiEndpoint', {
      value: speechToSpeech.eventApiEndpoint,
    });

    new CfnOutput(this, 'SpeechToSpeechModelIds', {
      value: JSON.stringify(params.speechToSpeechModelIds),
    });

    new CfnOutput(this, 'McpEnabled', {
      value: params.mcpEnabled.toString(),
    });

    new CfnOutput(this, 'McpEndpoint', {
      value: mcpEndpoint ?? '',
    });

    new CfnOutput(this, 'WebSearchEnabled', {
      value: (!!params.searchApiKey && !!params.searchEngine).toString(),
    });

    new CfnOutput(this, 'PptxEnabled', {
      value: params.pptxEnabled.toString(),
    });

    new CfnOutput(this, 'LitellmProxyEnabled', {
      value: params.litellmProxyEnabled.toString(),
    });

    new CfnOutput(this, 'LitellmProxyEndpoint', {
      value: litellmEndpoint ?? '',
    });

    new CfnOutput(this, 'TenantsTableName', {
      value: tenantManager.tenantsTable.tableName,
      description: 'Name of the DynamoDB Tenants table',
    });

    new CfnOutput(this, 'TenantRegistrationLambdaArn', {
      value: tenantManager.registrationLambda.functionArn,
      description: 'ARN of the tenant registration Lambda function',
    });

    if (api.centralPptxApi) {
      new CfnOutput(this, 'CentralPptxLambdaRoleArn', {
        value: api.centralPptxApi.pptxLambdaRole.roleArn,
        description:
          'ARN of the central PPTX Lambda execution role for cross-account tenant access',
        exportName: `${this.stackName}-CentralPptxLambdaRoleArn`,
      });
    }

    this.userPool = auth.userPool;
    this.userPoolClient = auth.client;

    this.exportValue(this.userPool.userPoolId);
    this.exportValue(this.userPoolClient.userPoolClientId);
  }
}
