import { Construct } from 'constructs';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { CfnRuntime } from 'aws-cdk-lib/aws-bedrockagentcore';
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
  // Add any specific configuration props if needed
  env: string;
  createGenericRuntime?: boolean;
  createAgentBuilderRuntime?: boolean;
}

export class GenericAgentCore extends Construct {
  private _deployedGenericRuntimeArn?: string;
  private _deployedAgentBuilderRuntimeArn?: string;
  private _ecrRepository?: Repository;
  private _imageUri?: string;
  private readonly genericRuntimeConfig: AgentCoreRuntimeConfig;
  private readonly agentBuilderRuntimeConfig: AgentCoreRuntimeConfig;
  private readonly _fileBucket: Bucket;
  private _genericAgentCoreRuntime?: CfnRuntime;
  private _agentBuilderAgentCoreRuntime?: CfnRuntime;
  private _sharedAgentCoreRuntimeRole?: Role;

  constructor(scope: Construct, id: string, props: GenericAgentCoreProps) {
    super(scope, id);

    const {
      env,
      createGenericRuntime = false,
      createAgentBuilderRuntime = false,
    } = props;

    // Load MCP configurations from specific paths
    const genericMcpServers = loadMCPConfig(
      path.join(__dirname, '../../assets/mcp-configs/generic.json')
    );
    const agentBuilderMcpServers = loadMCPConfig(
      path.join(__dirname, '../../assets/mcp-configs/agent-builder.json')
    );

    // Create dedicated S3 bucket for Agent Core Runtime
    this._fileBucket = new Bucket(this, 'AgentCoreFileBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Default configuration for Generic AgentCore Runtime
    this.genericRuntimeConfig = {
      name: `GenUGenericRuntime${env}`,
      instructions: 'You are a helpful assistant powered by AWS Bedrock.',
      memorySize: 2048,
      dockerPath: 'lambda-python/generic-agent-core-runtime',
      networkMode: 'PUBLIC',
      serverProtocol: 'HTTP',
      environmentVariables: {
        FILE_BUCKET: this._fileBucket.bucketName,
        MCP_SERVERS: JSON.stringify(genericMcpServers),
      },
    };

    // Configuration for AgentBuilder AgentCore Runtime
    this.agentBuilderRuntimeConfig = {
      name: `GenUAgentBuilderRuntime${env}`,
      instructions:
        'You are a helpful assistant for AgentBuilder powered by AWS Bedrock.',
      memorySize: 2048,
      dockerPath: 'lambda-python/generic-agent-core-runtime',
      networkMode: 'PUBLIC',
      serverProtocol: 'HTTP',
      environmentVariables: {
        FILE_BUCKET: this._fileBucket.bucketName,
        MCP_SERVERS: JSON.stringify(agentBuilderMcpServers),
      },
    };

    // Create Docker image asset and shared IAM role only if at least one runtime is needed
    if (createGenericRuntime || createAgentBuilderRuntime) {
      const dockerResult = this.createDockerImageAsset();
      this._ecrRepository = dockerResult.repository;
      this._imageUri = dockerResult.imageUri;

      // Create shared IAM role
      this._sharedAgentCoreRuntimeRole = this.createAgentCoreRuntimeRole();

      // Deploy runtimes based on flags
      if (createGenericRuntime) {
        this.deployGenericRuntime();
      }
      if (createAgentBuilderRuntime) {
        this.deployAgentBuilderRuntime();
      }
    }
  }

  /**
   * Deploy the generic AgentCore Runtime using L1 CDK Construct
   */
  private deployGenericRuntime(): void {
    // Create AgentCore Runtime using L1 CDK Construct
    this._genericAgentCoreRuntime = new CfnRuntime(
      this,
      'GenericAgentCoreRuntimeL1',
      {
        agentRuntimeName: this.genericRuntimeConfig.name,
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: this._imageUri!,
          },
        },
        roleArn: this._sharedAgentCoreRuntimeRole!.roleArn,
        networkConfiguration: {
          networkMode: this.genericRuntimeConfig.networkMode || 'PUBLIC',
        },
        protocolConfiguration:
          this.genericRuntimeConfig.serverProtocol || 'HTTP',
        environmentVariables: this.genericRuntimeConfig.environmentVariables,
      }
    );

    // Set the deployed runtime ARN
    this._deployedGenericRuntimeArn =
      this._genericAgentCoreRuntime.attrAgentRuntimeArn;
  }

  /**
   * Deploy the AgentBuilder AgentCore Runtime using L1 CDK Construct
   */
  private deployAgentBuilderRuntime(): void {
    // Create AgentCore Runtime using L1 CDK Construct
    this._agentBuilderAgentCoreRuntime = new CfnRuntime(
      this,
      'AgentBuilderAgentCoreRuntimeL1',
      {
        agentRuntimeName: this.agentBuilderRuntimeConfig.name,
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: this._imageUri!,
          },
        },
        roleArn: this._sharedAgentCoreRuntimeRole!.roleArn,
        networkConfiguration: {
          networkMode: this.agentBuilderRuntimeConfig.networkMode || 'PUBLIC',
        },
        protocolConfiguration:
          this.agentBuilderRuntimeConfig.serverProtocol || 'HTTP',
        environmentVariables:
          this.agentBuilderRuntimeConfig.environmentVariables,
      }
    );

    // Set the deployed runtime ARN
    this._deployedAgentBuilderRuntimeArn =
      this._agentBuilderAgentCoreRuntime.attrAgentRuntimeArn;
  }

  /**
   * Create Docker image asset for the MCP API
   */
  private createDockerImageAsset(): {
    repository: Repository;
    imageUri: string;
  } {
    const dockerPath =
      this.genericRuntimeConfig.dockerPath ||
      'lambda-python/generic-agent-core-runtime';
    const pathName = dockerPath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    const repository = new Repository(this, 'AgentCoreRuntimeRepository', {
      repositoryName: `${pathName}-${Stack.of(this).stackName.toLowerCase()}`,
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const dockerAsset = new DockerImageAsset(
      this,
      'AgentCoreRuntimeDockerAsset',
      {
        directory: path.join(__dirname, `../../${dockerPath}`),
        platform: Platform.LINUX_ARM64, // AgentCore for ARM platform
      }
    );

    return {
      repository,
      imageUri: dockerAsset.imageUri,
    };
  }

  /**
   * Create IAM role for AgentCore Runtime execution with comprehensive permissions
   */
  private createAgentCoreRuntimeRole(): Role {
    const region = Stack.of(this).region;
    const accountId = Stack.of(this).account;

    const role = new Role(this, 'AgentCoreRuntimeRole', {
      assumedBy: new ServicePrincipal('bedrock-agentcore.amazonaws.com', {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:aws:bedrock-agentcore:${region}:${accountId}:*`,
          },
        },
      }),
    });

    // Bedrock Model Invocation
    role.addToPolicy(
      new PolicyStatement({
        sid: 'BedrockModelInvocation',
        effect: Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          'arn:aws:bedrock:*::foundation-model/*',
          `arn:aws:bedrock:${region}:${accountId}:*`,
        ],
      })
    );

    // ECR Access
    role.addToPolicy(
      new PolicyStatement({
        sid: 'ECRImageAccess',
        effect: Effect.ALLOW,
        actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
        resources: [`arn:aws:ecr:${region}:${accountId}:repository/*`],
      })
    );

    role.addToPolicy(
      new PolicyStatement({
        sid: 'ECRTokenAccess',
        effect: Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      })
    );

    // CloudWatch Logs
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:DescribeLogStreams', 'logs:CreateLogGroup'],
        resources: [
          `arn:aws:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/*`,
        ],
      })
    );

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:DescribeLogGroups'],
        resources: [`arn:aws:logs:${region}:${accountId}:log-group:*`],
      })
    );

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
        ],
      })
    );

    // X-Ray Tracing
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
          'xray:GetSamplingRules',
          'xray:GetSamplingTargets',
        ],
        resources: ['*'],
      })
    );

    // CloudWatch Metrics
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'bedrock-agentcore',
          },
        },
      })
    );

    // Workload Identity
    role.addToPolicy(
      new PolicyStatement({
        sid: 'GetAgentAccessToken',
        effect: Effect.ALLOW,
        actions: [
          'bedrock-agentcore:GetWorkloadAccessToken',
          'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
          'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
        ],
        resources: [
          `arn:aws:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default`,
          `arn:aws:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default/workload-identity/*`,
        ],
      })
    );

    // S3 File Bucket Access
    this._fileBucket.grantWrite(role);

    // CodeInterpreter Tools
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

    return role;
  }

  /**
   * Get ECR repository
   */
  public get ecrRepository(): Repository | undefined {
    return this._ecrRepository;
  }

  /**
   * Get MCP API image URI
   */
  public get imageUri(): string | undefined {
    return this._imageUri;
  }

  /**
   * Get deployed generic runtime ARN
   */
  public get deployedGenericRuntimeArn(): string | undefined {
    return this._deployedGenericRuntimeArn;
  }

  /**
   * Get deployed AgentBuilder runtime ARN
   */
  public get deployedAgentBuilderRuntimeArn(): string | undefined {
    return this._deployedAgentBuilderRuntimeArn;
  }

  /**
   * Get the generic runtime configuration
   */
  public getGenericRuntimeConfig(): AgentCoreRuntimeConfig {
    return { ...this.genericRuntimeConfig };
  }

  /**
   * Get the AgentBuilder runtime configuration
   */
  public getAgentBuilderRuntimeConfig(): AgentCoreRuntimeConfig {
    return { ...this.agentBuilderRuntimeConfig };
  }

  /**
   * Get the file bucket for Agent Core Runtime
   */
  public get fileBucket(): Bucket {
    return this._fileBucket;
  }

  /**
   * Get the file bucket information (bucket name and region)
   */
  public get fileBucketInfo(): BucketInfo {
    return {
      bucketName: this._fileBucket.bucketName,
      region: Stack.of(this).region,
    };
  }
}
