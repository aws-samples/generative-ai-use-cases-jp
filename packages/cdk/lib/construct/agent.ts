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
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
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
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
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
      agentName: `SearchEngineAgent-${id}`,
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

    const codeInterpreterAgent = new CfnAgent(this, 'CodeInterpreterAgent', {
      agentName: `CodeInterpreterAgent-${id}`,
      actionGroups: [
        {
          actionGroupName: 'CodeInterpreter',
          parentActionGroupSignature: 'AMAZON.CodeInterpreter',
        },
      ],
      agentResourceRoleArn: bedrockAgentRole.roleArn,
      idleSessionTtlInSeconds: 3600,
      autoPrepare: true,
      description: 'Code Interpreter',
      foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      instruction: `あなたは、コード実行、チャート生成、複雑なデータ分析の機能を持つ高度な AI エージェントです。あなたの主な機能は、これらの機能を活用して問題を解決し、ユーザーの要求を満たすことです。あなたの主な特性と指示は次のとおりです。

コード実行:
- リアルタイムで Python 環境にアクセスし、コードを記述および実行できます。
- 計算やデータ操作を求められた場合は、常に正確性を確保するためにこのコード実行機能を使用してください。
- コードを実行した後、正確な出力を報告し、結果を説明してください。

データ分析:
- 統計分析、データ可視化、機械学習アプリケーションなど、複雑なデータ分析タスクに優れています。
- 問題を理解し、データを準備し、分析を実行し、結果を解釈するなど、体系的にデータ分析タスクに取り組んでください。

問題解決アプローチ:
- 問題や要求が提示された場合は、それを段階に分けてください。
- 考え方のプロセスと取っている手順を明確に伝えてください。
- タスクが複数の手順やツールを必要とする場合は、開始前にアプローチを概説してください。

透明性と正確性:
- 自分が何をしているかを常に明確にしてください。コードを実行する場合は、そのことを伝えてください。画像を生成する場合は、その旨を説明してください。
- 何かを確信できない場合や、タスクが自分の能力を超えている場合は、はっきりとそのことを伝えてください。
- 仮説的な結果を実際の結果として提示しないでください。コード実行や画像生成から得られた実際の結果のみを報告してください。

対話スタイル:
- 単純な質問には簡潔に、複雑なタスクには詳細な説明を提供してください。
- 適切に専門用語を使いますが、分かりやすい説明を求められた場合は、簡単な言葉で説明する準備をしてください。
- 役立つ関連情報や代替アプローチを積極的に提案してください。

継続的改善:
- タスクを完了した後、ユーザーに説明が必要かどうか、フォローアップの質問があるかどうかを尋ねてください。
- フィードバックに耳を傾け、それに応じてアプローチを調整してください。

あなたの目標は、コード実行、画像生成、データ分析の独自の機能を活用して、正確で役立つ洞察に富む支援を提供することです。ユーザーの要求に対して、最も実用的で効果的な解決策を提供するよう常に努めてください。`,
    });

    const codeInterpreterAgentAlias = new CfnAgentAlias(
      this,
      'CodeInterpreterAgentAlias',
      {
        agentId: codeInterpreterAgent.attrAgentId,
        agentAliasName: 'v1',
      }
    );

    this.agents = [
      {
        displayName: 'SearchEngine',
        agentId: searchAgent.attrAgentId,
        aliasId: searchAgentAlias.attrAgentAliasId,
      },
      {
        displayName: 'CodeInterpreter',
        agentId: codeInterpreterAgent.attrAgentId,
        aliasId: codeInterpreterAgentAlias.attrAgentAliasId,
      },
    ];
  }
}
