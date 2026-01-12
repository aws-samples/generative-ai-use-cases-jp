import { Construct } from 'constructs';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import {
  Runtime,
  RuntimeNetworkConfiguration,
  ProtocolType,
  AgentRuntimeArtifact,
} from '@aws-cdk/aws-bedrock-agentcore-alpha';
import { BucketInfo } from 'generative-ai-use-cases';
import * as path from 'path';

export interface ResearchAgentCoreProps {
  env: string;
  braveApiKeys?: string[];
  tavilyApiKeys?: string[];
  gatewayArns?: string[];
}

export class ResearchAgentCore extends Construct {
  private readonly _fileBucket: Bucket;
  private readonly _runtime: Runtime;
  private readonly _role: Role;

  constructor(scope: Construct, id: string, props: ResearchAgentCoreProps) {
    super(scope, id);

    const { env, braveApiKeys = [], tavilyApiKeys = [], gatewayArns } = props;

    // Create bucket
    this._fileBucket = new Bucket(this, 'ResearchAgentFileBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create execution role
    this._role = this.createExecutionRole();

    // Configure role permissions
    this.configureRolePermissions(this._role, gatewayArns);

    // Create runtime
    this._runtime = this.createRuntime(env, braveApiKeys, tavilyApiKeys);
  }

  private createRuntime(
    env: string,
    propsBraveApiKeys: string[],
    propsTavilyApiKeys: string[]
  ): Runtime {
    const region = Stack.of(this).region;

    const environmentVariables: Record<string, string> = {
      MCP_CONFIG_PATH: '/var/task/mcp-configs/mcp.json',
      MAX_ITERATIONS: '200',
      CLAUDE_CODE_USE_BEDROCK: '1',
      AWS_REGION: region,
    };

    // Add API keys from props or context
    const braveApiKeys =
      propsBraveApiKeys.length > 0
        ? propsBraveApiKeys
        : this.node.tryGetContext('researchAgentBraveApiKeys') || [];
    if (Array.isArray(braveApiKeys) && braveApiKeys.length > 0) {
      environmentVariables.BRAVE_API_KEYS = JSON.stringify(braveApiKeys);
    }

    const tavilyApiKeys =
      propsTavilyApiKeys.length > 0
        ? propsTavilyApiKeys
        : this.node.tryGetContext('researchAgentTavilyApiKeys') || [];
    if (Array.isArray(tavilyApiKeys) && tavilyApiKeys.length > 0) {
      environmentVariables.TAVILY_API_KEYS = JSON.stringify(tavilyApiKeys);
    }

    return new Runtime(this, 'ResearchAgentCoreRuntime', {
      runtimeName: `GenUResearchRuntime${env}`,
      agentRuntimeArtifact: AgentRuntimeArtifact.fromAsset(
        path.join(__dirname, '../../lambda-python/research-agent-core-runtime')
      ),
      executionRole: this._role,
      networkConfiguration: RuntimeNetworkConfiguration.usingPublicNetwork(),
      protocolConfiguration: ProtocolType.HTTP,
      environmentVariables,
    });
  }

  private createExecutionRole(): Role {
    const region = Stack.of(this).region;
    const accountId = Stack.of(this).account;

    return new Role(this, 'ResearchAgentCoreRuntimeRole', {
      assumedBy: new ServicePrincipal('bedrock-agentcore.amazonaws.com', {
        conditions: {
          StringEquals: { 'aws:SourceAccount': accountId },
          ArnLike: {
            'aws:SourceArn': `arn:aws:bedrock-agentcore:${region}:${accountId}:*`,
          },
        },
      }),
    });
  }

  private configureRolePermissions(role: Role, gatewayArns?: string[]): void {
    // Bedrock permissions
    role.addToPolicy(
      new PolicyStatement({
        sid: 'BedrockModelInvocation',
        effect: Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
      })
    );

    // Service-linked role creation
    role.addToPolicy(
      new PolicyStatement({
        sid: 'CreateServiceLinkedRole',
        effect: Effect.ALLOW,
        actions: ['iam:CreateServiceLinkedRole'],
        resources: [
          'arn:aws:iam::*:role/aws-service-role/runtime-identity.bedrock-agentcore.amazonaws.com/AWSServiceRoleForBedrockAgentCoreRuntimeIdentity',
        ],
        conditions: {
          StringEquals: {
            'iam:AWSServiceName':
              'runtime-identity.bedrock-agentcore.amazonaws.com',
          },
        },
      })
    );

    // CodeInterpreter tools
    role.addToPolicy(
      new PolicyStatement({
        sid: 'Tools',
        effect: Effect.ALLOW,
        actions: [
          'bedrock-agentcore:CreateCodeInterpreter',
          'bedrock-agentcore:StartCodeInterpreterSession',
          'bedrock-agentcore:InvokeCodeInterpreter',
          'bedrock-agentcore:StopCodeInterpreterSession',
          'bedrock-agentcore:DeleteCodeInterpreter',
          'bedrock-agentcore:ListCodeInterpreters',
          'bedrock-agentcore:GetCodeInterpreter',
          'bedrock-agentcore:GetCodeInterpreterSession',
          'bedrock-agentcore:ListCodeInterpreterSessions',
        ],
        resources: ['*'],
      })
    );

    // Gateway tools
    role.addToPolicy(
      new PolicyStatement({
        sid: 'AllowGatewayInvocation',
        effect: Effect.ALLOW,
        actions: ['bedrock-agentcore:InvokeGateway'],
        resources: gatewayArns && gatewayArns.length > 0 ? gatewayArns : ['*'],
      })
    );

    this._fileBucket.grantWrite(role);
  }

  // Public getters
  public get deployedRuntimeArn(): string | undefined {
    return this._runtime.agentRuntimeArn;
  }

  public get fileBucket(): Bucket {
    return this._fileBucket;
  }

  public get fileBucketInfo(): BucketInfo {
    return {
      bucketName: this._fileBucket.bucketName,
      region: Stack.of(this).region,
    };
  }
}
