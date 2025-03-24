import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as oss from 'aws-cdk-lib/aws-opensearchserverless';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ProcessedStackInput } from './stack-input';

const UUID = '339C5FED-A1B5-43B6-B40A-5E8E59E5734D';

// 以下が現状 Embedding model としてサポートされているモデル ID
// Dimension は最終的に Custom resource の props として渡すが
// 勝手に型が変換されてしまう Issue があるため、number ではなく string にしておく
// https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1037
const MODEL_VECTOR_MAPPING: { [key: string]: string } = {
  'amazon.titan-embed-text-v1': '1536',
  'amazon.titan-embed-text-v2:0': '1024',
  'cohere.embed-multilingual-v3': '1024',
  'cohere.embed-english-v3': '1024',
};

// parsingConfiguration で PDF ファイルの中に埋め込まれている画像やグラフや表を読み取る機能がある。
// 読み取る際のプロンプトは任意のものが定義できる。以下に const として定義する。利用環境によってプロンプトを変更することで、より高い精度を期待できる。
// https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html#kb-advanced-parsing
const PARSING_PROMPT = `ドキュメントに含まれる画像やグラフや表などの Image コンテンツからテキストを書き写して、コードブロックではないMarkdown構文で出力してください。以下の手順に従ってください：

1. 提供されたページを注意深く調べてください。

2. ページに存在するすべての要素を特定してください。これには見出し、本文、脚注、表、視覚化、キャプション、ページ番号などが含まれます。

3. Markdown構文のフォーマットを使用して出力してください : 
- 見出し：主見出しには#、セクションには##、サブセクションには###など
- リスト：箇条書きには* または -、番号付きリストには1. 2. 3.
- 繰り返しは避けてください

4. 要素が Visualization の場合：
- 自然言語で詳細な説明を提供してください
- 説明を提供した後、Visualization 内のテキストは転写しないでください

5. 要素が表の場合：
- Markdownの表を作成し、すべての行が同じ列数を持つようにしてください
- セルの配置をできるだけ忠実に維持してください
- 表を複数の表に分割しないでください
- 結合されたセルが複数の行や列にまたがる場合、テキストを左上のセルに配置し、他のセルには ' ' を出力してください
- 列の区切りには | を使用し、ヘッダー行の区切りには |-|-| を使用してください
- セルに複数の項目がある場合、別々の行にリストしてください
- 表にサブヘッダーがある場合、サブヘッダーをヘッダーから別の行で分離してください

6. 要素が段落の場合：
- 各テキスト要素を表示されているとおりに正確に転写してください

7. 要素がヘッダー、フッター、脚注、ページ番号の場合：
- 各テキスト要素を表示されているとおりに正確に転写してください

出力例：

Y軸に「売上高（$百万）」、X軸に「年」とラベル付けされた年間売上高を示す棒グラフ。グラフには2018年（$12M）、2019年（$18M）、2020年（$8M）、2021年（$22M）の棒がある。
図3：このグラフは年間売上高を百万ドル単位で示しています。2020年はCOVID-19パンデミックの影響で大幅に減少しました。

年次報告書
財務ハイライト
収益：$40M
利益：$12M
EPS：$1.25
| | 12月31日終了年度 | |

2021	2022
キャッシュフロー：		
営業活動	$ 46,327	$ 46,752
投資活動	(58,154)	(37,601)
財務活動	6,291	9,718`;

const EMBEDDING_MODELS = Object.keys(MODEL_VECTOR_MAPPING);

interface OpenSearchServerlessIndexProps {
  collectionId: string;
  vectorIndexName: string;
  vectorField: string;
  metadataField: string;
  textField: string;
  vectorDimension: string;
  ragKnowledgeBaseBinaryVector: boolean;
}

class OpenSearchServerlessIndex extends Construct {
  public readonly customResourceHandler: lambda.IFunction;
  public readonly customResource: cdk.CustomResource;

  constructor(
    scope: Construct,
    id: string,
    props: OpenSearchServerlessIndexProps
  ) {
    super(scope, id);

    const customResourceHandler = new lambda.SingletonFunction(
      this,
      'OpenSearchServerlessIndex',
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        code: lambda.Code.fromAsset('custom-resources'),
        handler: 'oss-index.handler',
        uuid: UUID,
        lambdaPurpose: 'OpenSearchServerlessIndex',
        timeout: cdk.Duration.minutes(15),
      }
    );

    const customResource = new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: customResourceHandler.functionArn,
      resourceType: 'Custom::OssIndex',
      properties: props,
    });

    this.customResourceHandler = customResourceHandler;
    this.customResource = customResource;
  }
}

export interface RagKnowledgeBaseStackProps extends StackProps {
  params: ProcessedStackInput;
  collectionName?: string;
  vectorIndexName?: string;
  vectorField?: string;
  metadataField?: string;
  textField?: string;
}

export class RagKnowledgeBaseStack extends Stack {
  public readonly knowledgeBaseId: string;
  public readonly dataSourceBucketName: string;

  constructor(scope: Construct, id: string, props: RagKnowledgeBaseStackProps) {
    super(scope, id, props);

    const {
      env,
      embeddingModelId,
      ragKnowledgeBaseStandbyReplicas,
      ragKnowledgeBaseAdvancedParsing,
      ragKnowledgeBaseAdvancedParsingModelId,
      ragKnowledgeBaseBinaryVector,
    } = props.params;

    if (typeof embeddingModelId !== 'string') {
      throw new Error(
        'Knowledge Base RAG が有効になっていますが、embeddingModelId が指定されていません'
      );
    }

    if (!EMBEDDING_MODELS.includes(embeddingModelId)) {
      throw new Error(
        `embeddingModelId が無効な値です (有効な embeddingModelId ${EMBEDDING_MODELS})`
      );
    }

    const collectionName =
      props.collectionName ?? `generative-ai-use-cases-jp${env.toLowerCase()}`;
    const vectorIndexName =
      props.vectorIndexName ?? 'bedrock-knowledge-base-default';
    const vectorField =
      props.vectorField ?? 'bedrock-knowledge-base-default-vector';
    const textField = props.textField ?? 'AMAZON_BEDROCK_TEXT_CHUNK';
    const metadataField = props.metadataField ?? 'AMAZON_BEDROCK_METADATA';

    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    });

    if (
      ragKnowledgeBaseAdvancedParsing &&
      typeof ragKnowledgeBaseAdvancedParsingModelId !== 'string'
    ) {
      throw new Error(
        'Knowledge Base RAG の Advanced Parsing が有効ですが、ragKnowledgeBaseAdvancedParsingModelId が指定されていないか、文字列ではありません'
      );
    }

    const collection = new oss.CfnCollection(this, 'Collection', {
      name: collectionName,
      description: 'GenU Collection',
      type: 'VECTORSEARCH',
      standbyReplicas: ragKnowledgeBaseStandbyReplicas ? 'ENABLED' : 'DISABLED',
    });

    const ossIndex = new OpenSearchServerlessIndex(this, 'OssIndex', {
      collectionId: collection.ref,
      vectorIndexName,
      vectorField,
      textField,
      metadataField,
      vectorDimension: MODEL_VECTOR_MAPPING[embeddingModelId],
      ragKnowledgeBaseBinaryVector,
    });

    ossIndex.customResourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(collection.getAtt('Arn'))],
        actions: ['aoss:APIAccessAll'],
      })
    );

    const accessPolicy = new oss.CfnAccessPolicy(this, 'AccessPolicy', {
      name: collectionName,
      policy: JSON.stringify([
        {
          Rules: [
            {
              Resource: [`collection/${collectionName}`],
              Permission: [
                'aoss:DescribeCollectionItems',
                'aoss:CreateCollectionItems',
                'aoss:UpdateCollectionItems',
              ],
              ResourceType: 'collection',
            },
            {
              Resource: [`index/${collectionName}/*`],
              Permission: [
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
                'aoss:CreateIndex',
                'aoss:DeleteIndex',
              ],
              ResourceType: 'index',
            },
          ],
          Principal: [
            knowledgeBaseRole.roleArn,
            ossIndex.customResourceHandler.role?.roleArn,
          ],
          Description: '',
        },
      ]),
      type: 'data',
    });

    const networkPolicy = new oss.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: collectionName,
      policy: JSON.stringify([
        {
          Rules: [
            {
              Resource: [`collection/${collectionName}`],
              ResourceType: 'collection',
            },
            {
              Resource: [`collection/${collectionName}`],
              ResourceType: 'dashboard',
            },
          ],
          AllowFromPublic: true,
        },
      ]),
      type: 'network',
    });

    const encryptionPolicy = new oss.CfnSecurityPolicy(
      this,
      'EncryptionPolicy',
      {
        name: collectionName,
        policy: JSON.stringify({
          Rules: [
            {
              Resource: [`collection/${collectionName}`],
              ResourceType: 'collection',
            },
          ],
          AWSOwnedKey: true,
        }),
        type: 'encryption',
      }
    );

    collection.node.addDependency(accessPolicy);
    collection.node.addDependency(networkPolicy);
    collection.node.addDependency(encryptionPolicy);

    const accessLogsBucket = new s3.Bucket(this, 'DataSourceAccessLogsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
    });

    const dataSourceBucket = new s3.Bucket(this, 'DataSourceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'AccessLogs/',
      enforceSSL: true,
    });

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:InvokeModel'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(collection.getAtt('Arn'))],
        actions: ['aoss:APIAccessAll'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: collectionName,
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/${embeddingModelId}`,
          ...(ragKnowledgeBaseBinaryVector
            ? {
                embeddingModelConfiguration: {
                  bedrockEmbeddingModelConfiguration: {
                    embeddingDataType: 'BINARY',
                  },
                },
              }
            : {}),
        },
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: cdk.Token.asString(collection.getAtt('Arn')),
          fieldMapping: {
            metadataField,
            textField,
            vectorField,
          },
          vectorIndexName,
        },
      },
    });

    new bedrock.CfnDataSource(this, 'DataSource', {
      dataSourceConfiguration: {
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${dataSourceBucket.bucketName}`,
          inclusionPrefixes: ['docs/'],
        },
        type: 'S3',
      },
      vectorIngestionConfiguration: {
        ...(ragKnowledgeBaseAdvancedParsing
          ? {
              // Advanced Parsing を有効化する場合のみ、parsingConfiguration を構成する
              parsingConfiguration: {
                parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
                bedrockFoundationModelConfiguration: {
                  modelArn: `arn:aws:bedrock:${this.region}::foundation-model/${ragKnowledgeBaseAdvancedParsingModelId}`,
                  parsingPrompt: {
                    parsingPromptText: PARSING_PROMPT,
                  },
                },
              },
            }
          : {}),
        // チャンク戦略を変更したい場合は、以下のコメントアウトを外して、各種パラメータを調整することで、環境に合わせた環境構築が可能です。
        // 以下の 4 種類のチャンク戦略が選択可能です。
        // - デフォルト (何も指定しない)
        // - セマンティックチャンク
        // - 階層チャンク
        // - 標準チャンク
        // 詳細は以下の Document を参照ください。
        // https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html
        // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnDataSource.ChunkingConfigurationProperty.html
        //
        // セマンティックチャンク
        // chunkingConfiguration: {
        //   chunkingStrategy: 'SEMANTIC',
        //   semanticChunkingConfiguration: {
        //     maxTokens: 300,
        //     bufferSize: 0,
        //     breakpointPercentileThreshold: 95,
        //   },
        // },
        //
        // 階層チャンク
        // chunkingConfiguration: {
        //   chunkingStrategy: 'HIERARCHICAL',
        //   hierarchicalChunkingConfiguration: {
        //     levelConfigurations: [
        //       {
        //         maxTokens: 1500, // 親チャンクの Max Token サイズ
        //       },
        //       {
        //         maxTokens: 300, // 子チャンクの Max Token サイズ
        //       },
        //     ],
        //     overlapTokens: 60,
        //   },
        // },
        //
        // 標準チャンク
        // chunkingConfiguration: {
        //   chunkingStrategy: 'FIXED_SIZE',
        //   fixedSizeChunkingConfiguration: {
        //     maxTokens: 300,
        //     overlapPercentage: 10,
        //   },
        // },
      },
      knowledgeBaseId: knowledgeBase.ref,
      name: 's3-data-source',
    });

    knowledgeBase.addDependency(collection);
    knowledgeBase.node.addDependency(ossIndex.customResource);

    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./rag-docs')],
      destinationBucket: dataSourceBucket,
      // 以前の設定で同 Bucket にアクセスログが残っている可能性があるため、この設定は残す
      exclude: ['AccessLogs/*', 'logs*'],
    });

    this.knowledgeBaseId = knowledgeBase.ref;
    this.dataSourceBucketName = dataSourceBucket.bucketName;
  }
}
