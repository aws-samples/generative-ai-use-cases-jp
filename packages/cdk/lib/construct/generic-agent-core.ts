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
import { loadMCPConfig } from '../utils/mcp-config-loader';

export interface AgentCoreRuntimeConfig {
  name: string;
  instructions?: string;
  memorySize?: number;
  customRuntimeConfig?: Record<string, unknown>;
  dockerPath?: string; // Docker file path of AgentCore Runtime
  networkMode?: string; // PUBLIC
  serverProtocol?: string; // HTTP, MCP
  environmentVariables?: Record<string, string>;
}

export interface GenericAgentCoreProps {
  env: string;
  createGenericRuntime?: boolean;
  createAgentBuilderRuntime?: boolean;
}

interface RuntimeResources {
  genericRuntime?: Runtime;
  agentBuilderRuntime?: Runtime;
  role: Role;
}

export class GenericAgentCore extends Construct {
  private readonly _fileBucket: Bucket;
  private readonly genericRuntimeConfig: AgentCoreRuntimeConfig;
  private readonly agentBuilderRuntimeConfig: AgentCoreRuntimeConfig;
  private readonly resources: RuntimeResources;

  constructor(scope: Construct, id: string, props: GenericAgentCoreProps) {
    super(scope, id);

    const {
      env,
      createGenericRuntime = false,
      createAgentBuilderRuntime = false,
    } = props;

    // Create bucket first
    this._fileBucket = this.createFileBucket();

    // Load configurations
    const configs = this.loadConfigurations(env, this._fileBucket.bucketName);
    this.genericRuntimeConfig = configs.generic;
    this.agentBuilderRuntimeConfig = configs.agentBuilder;

    // Create all resources atomically
    this.resources = this.createResources(
      createGenericRuntime,
      createAgentBuilderRuntime
    );
  }

  private createFileBucket(): Bucket {
    return new Bucket(this, 'AgentCoreFileBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }

  private loadConfigurations(env: string, bucketName: string) {
    const genericMcpServers = loadMCPConfig(
      path.join(__dirname, '../../assets/mcp-configs/generic.json')
    );
    const agentBuilderMcpServers = loadMCPConfig(
      path.join(__dirname, '../../assets/mcp-configs/agent-builder.json')
    );

    return {
      generic: {
        name: `GenUGenericRuntime${env}`,
        instructions: 'You are a helpful assistant powered by AWS Bedrock.',
        memorySize: 2048,
        dockerPath: 'lambda-python/generic-agent-core-runtime',
        networkMode: 'PUBLIC',
        serverProtocol: 'HTTP',
        environmentVariables: {
          FILE_BUCKET: bucketName,
          MCP_SERVERS: JSON.stringify(genericMcpServers),
        },
      },
      agentBuilder: {
        name: `GenUAgentBuilderRuntime${env}`,
        instructions:
          'You are a helpful assistant for AgentBuilder powered by AWS Bedrock.',
        memorySize: 2048,
        dockerPath: 'lambda-python/generic-agent-core-runtime',
        networkMode: 'PUBLIC',
        serverProtocol: 'HTTP',
        environmentVariables: {
          FILE_BUCKET: bucketName,
          MCP_SERVERS: JSON.stringify(agentBuilderMcpServers),
        },
      },
    };
  }

  private createResources(
    createGeneric: boolean,
    createAgentBuilder: boolean
  ): RuntimeResources {
    if (!createGeneric && !createAgentBuilder) {
      return { role: this.createExecutionRole() };
    }

    const role = this.createExecutionRole();
    const resources: RuntimeResources = { role };

    if (createGeneric) {
      resources.genericRuntime = this.createRuntime(
        'Generic',
        this.genericRuntimeConfig,
        role
      );
    }

    if (createAgentBuilder) {
      resources.agentBuilderRuntime = this.createRuntime(
        'AgentBuilder',
        this.agentBuilderRuntimeConfig,
        role
      );
    }

    this.configureRolePermissions(role);
    return resources;
  }

  private createRuntime(
    type: string,
    config: AgentCoreRuntimeConfig,
    role: Role
  ): Runtime {
    return new Runtime(this, `${type}AgentCoreRuntime`, {
      runtimeName: config.name,
      agentRuntimeArtifact: AgentRuntimeArtifact.fromAsset(
        path.join(__dirname, `../../${config.dockerPath}`)
      ),
      executionRole: role,
      networkConfiguration: RuntimeNetworkConfiguration.usingPublicNetwork(),
      protocolConfiguration: ProtocolType.HTTP,
      environmentVariables: config.environmentVariables,
    });
  }

  private createExecutionRole(): Role {
    const region = Stack.of(this).region;
    const accountId = Stack.of(this).account;

    return new Role(this, 'AgentCoreRuntimeRole', {
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

  private configureRolePermissions(role: Role): void {
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

    this._fileBucket.grantWrite(role);
  }

  // Public getters - all non-optional
  public get deployedGenericRuntimeArn(): string | undefined {
    return this.resources.genericRuntime?.agentRuntimeArn;
  }

  public get deployedAgentBuilderRuntimeArn(): string | undefined {
    return this.resources.agentBuilderRuntime?.agentRuntimeArn;
  }

  public getGenericRuntimeConfig(): AgentCoreRuntimeConfig {
    return { ...this.genericRuntimeConfig };
  }

  public getAgentBuilderRuntimeConfig(): AgentCoreRuntimeConfig {
    return { ...this.agentBuilderRuntimeConfig };
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
