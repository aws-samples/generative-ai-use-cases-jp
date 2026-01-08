import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  IAuthorizer,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
  Agent,
  AgentMap,
  ModelConfiguration,
  SelfSignUpTenantMapEntry,
  HiddenUseCases,
} from 'generative-ai-use-cases';
import { LitellmProxyServer } from '../litellm-proxy-server';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IdentityPool } from 'aws-cdk-lib/aws-cognito-identitypool';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { TenantManager } from '../tenant-manager';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export type GenericApiProps = {
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
  readonly environment: string;

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
  readonly tenantsTable?: Table;

  // LangChain Credentials
  readonly openai?: {
    readonly apiKey: string; // OPENAI_API_KEY
  };

  api: RestApi;
  fileBucket: Bucket;

  commonAuthorizerProps: {
    authorizationType: AuthorizationType;
    authorizer: IAuthorizer;
  };

  agentMap: AgentMap;

  // Policy
  sagemakerPolicy?: PolicyStatement;
  bedrockPolicy?: PolicyStatement;
  logsPolicy?: PolicyStatement;
  assumeRolePolicy?: PolicyStatement;

  selfSignUpTenantMap?: SelfSignUpTenantMapEntry[] | null;

  // Web Search
  readonly searchApiKey?: string | null;
  readonly searchEngine?: 'Brave' | 'Tavily';
};
