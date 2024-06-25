import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnAgent, CfnAgentAlias } from 'aws-cdk-lib/aws-bedrock';
import { Agent as AgentType } from 'generative-ai-use-cases-jp';

export class Agent extends Construct {
  public readonly agents: AgentType[];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // search api
    const searchApiKey = this.node.tryGetContext('searchApiKey') || '';

    // agents for bedrock の schema やデータを配置するバケット
    const s3Bucket = new Bucket(this, 'Bucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // schema を s3 に配置
    const schema = new BucketDeployment(this, 'ApiSchemaBucket', {
      sources: [Source.asset('assets/api-schema')],
      destinationBucket: s3Bucket,
      destinationKeyPrefix: 'api-schema',
    });

    // Lambda
    const bedrockAgentLambda = new NodejsFunction(this, 'BedrockAgentLambda', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/agent.ts',
      timeout: Duration.seconds(300),
      environment: {
        SEARCH_API_KEY: searchApiKey,
      },
    });
    bedrockAgentLambda.grantInvoke(
      new ServicePrincipal('bedrock.amazonaws.com')
    );

    // Agent
    const bedrockAgentRole = new Role(this, 'BedrockAgentRole', {
      roleName: 'AmazonBedrockExecutionRoleForAgents_SearchEngine',
      assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        BedrockAgentS3BucketPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              resources: [s3Bucket.bucketArn, `${s3Bucket.bucketArn}/*`],
              actions: ['*'],
            }),
          ],
        }),
        BedrockAgentBedrockModelPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              resources: ['*'],
              actions: ['bedrock:*'],
            }),
          ],
        }),
      },
    });

    const searchAgent = new CfnAgent(this, 'SearchAgent', {
      agentName: 'SearchEngine',
      actionGroups: [
        {
          actionGroupName: 'Search',
          actionGroupExecutor: {
            lambda: bedrockAgentLambda.functionArn,
          },
          apiSchema: {
            s3: {
              s3BucketName: schema.deployedBucket.bucketName,
              s3ObjectKey: 'api-schema/api-schema.json',
            },
          },
          description: 'Search',
        },
        {
          actionGroupName: 'UserInput',
          parentActionGroupSignature: 'AMAZON.UserInput',
        },
      ],
      agentResourceRoleArn: bedrockAgentRole.roleArn,
      idleSessionTtlInSeconds: 3600,
      autoPrepare: true,
      description: 'Search Agent',
      foundationModel: 'anthropic.claude-3-haiku-20240307-v1:0',
      instruction:
        'あなたは指示に応えるアシスタントです。 指示に応えるために必要な情報が十分な場合はすぐに回答し、不十分な場合は検索を行い必要な情報を入手し回答してください。複数回検索することが可能です。',
    });

    const searchAgentAlias = new CfnAgentAlias(this, 'SearchAgentAlias', {
      agentId: searchAgent.attrAgentId,
      agentAliasName: 'v1',
    });

    this.agents = [
      {
        displayName: 'SearchEngine',
        agentId: searchAgent.attrAgentId,
        aliasId: searchAgentAlias.attrAgentAliasId,
      },
    ];
  }
}
