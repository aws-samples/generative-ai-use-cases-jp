import { NestedStack, StackProps, Aws } from 'aws-cdk-lib';
import { ProcessedStackInput } from '../../stack-input';
import { Api, Auth } from '../../construct';
import AssistantApi from '../../construct/api/assistant';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { TenantManager } from '../../construct/tenant-manager';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
} from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

interface AssistantApiStackProps extends StackProps {
  params: ProcessedStackInput;
  api: Api;
  auth: Auth;
  assistantTable: Table;
  assistantMessagesTable: Table;
  fileBucket: Bucket;
  tenantManager?: TenantManager;
  videoBucketRegionMap?: Record<string, string>;
  guardrailIdentifier?: string;
  guardrailVersion?: string;
}

class AssistantApiStack extends NestedStack {
  readonly assistantApi: AssistantApi;

  constructor(scope: Construct, id: string, props: AssistantApiStackProps) {
    super(scope, id, props);

    const {
      params,
      api,
      auth,
      assistantTable,
      assistantMessagesTable,
      fileBucket,
      tenantManager,
      videoBucketRegionMap,
      guardrailIdentifier,
      guardrailVersion,
    } = props;

    // Create authorizer for the nested stack
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [auth.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    // Create Bedrock policy for LLM calls
    const bedrockPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    });

    const assistantApi = new AssistantApi(this, 'AssistantAPI', {
      // Context params from parent api
      modelRegion: api.modelRegion,
      modelIds: api.modelIds,
      imageGenerationModelIds: api.imageGenerationModelIds,
      videoGenerationModelIds: api.videoGenerationModelIds,
      videoBucketRegionMap: videoBucketRegionMap || {},
      endpointNames: api.endpointNames,
      queryDecompositionEnabled: params.queryDecompositionEnabled,
      rerankingModelId: params.rerankingModelId,
      customAgents: params.agents,
      crossAccountBedrockRoleArn: params.crossAccountBedrockRoleArn,
      allowedIpV4AddressRanges: params.allowedIpV4AddressRanges,
      allowedIpV6AddressRanges: params.allowedIpV6AddressRanges,
      litellmEndpoint: null,
      litellmProxy: null,
      environment: params.env,
      selfSignUpTenantMap: params.selfSignUpTenantMap,

      // Resources
      userPool: auth.userPool,
      idPool: auth.idPool,
      userPoolClient: auth.client,
      table: assistantTable, // Use assistant table as main table
      statsTable: assistantTable, // Reuse for stats
      assistantTable,
      assistantMessagesTable,
      knowledgeBaseId: params.ragKnowledgeBaseId || undefined,
      agents: params.agents,
      guardrailIdentify: guardrailIdentifier,
      guardrailVersion: guardrailVersion,
      tenantManager,

      // API Gateway
      api: api.restApi,
      fileBucket,
      commonAuthorizerProps,
      agentMap: api.agentNames.reduce(
        (acc, name) => ({ ...acc, [name]: { agentId: '', aliasId: '' } }),
        {}
      ),

      // Policies
      bedrockPolicy,

      // OpenAI
      openai: params.openai,
    });

    this.assistantApi = assistantApi;
  }
}

export default AssistantApiStack;
