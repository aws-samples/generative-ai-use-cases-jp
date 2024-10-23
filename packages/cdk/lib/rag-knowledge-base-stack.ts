import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as oss from 'aws-cdk-lib/aws-opensearchserverless';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';

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
const PARSING_PROMPT = `Please transcribe the text from image content such as images, graphs, and tables included in the document, and output it in Markdown syntax that is not a code block. Follow these steps:

1. Please examine the provided pages carefully.

2. Please identify all elements present on the page. This includes headings, body text, footnotes, tables, visualizations, captions, page numbers, etc.

3. Please use Markdown syntax for the output:
- Headings: #for main headings, ## for sections, ### for subsections, etc.
- Lists: * or - for bulleted lists, 1. 2. 3. for numbered lists
- Avoid repetition

4. If the element is "Visualization":
- Please provide a detailed explanation in natural language
- After providing the explanation, do not transcribe any text within the Visualization

5. If the element is a table:
- Create a Markdown table, ensuring all rows have the same number of columns
- Maintain the cell placement as faithfully as possible
- Do not split the table into multiple tables
- If merged cells span multiple rows or columns, place the text in the top-left cell and output ' ' for the other cells
- Use | as the column separator and |-|-| as the header row separator
- If a cell has multiple items, list them on separate lines
- If the table has sub-headers, separate the sub-headers from the headers on a different line

6. If the element is a paragraph:
- Transcribe each text element accurately as it appears

7. If the element is a header, footer, footnote, or page number:
- Transcribe each text element accurately as it appears

Output example:

A bar graph showing annual revenue with the Y-axis labeled "Revenue ($M)" and the X-axis labeled "Year". The graph has bars for 2018 ($12M), 2019 ($18M), 2020 ($8M), and 2021 ($22M).
Figure 3: This graph shows annual revenue in millions of dollars. Revenue declined significantly in 2020 due to the impact of the COVID-19 pandemic.

Annual Report
Financial Highlights
Revenue: $40M
Profit: $12M
EPS: $1.25
| | Year Ended December 31, | |

2021    2022
Cash Flows:
Operating    $ 46,327    $ 46,752
Investing    (58,154)    (37,601)
Financing    6,291   9,718`;

const EMBEDDING_MODELS = Object.keys(MODEL_VECTOR_MAPPING);

interface OpenSearchServerlessIndexProps {
  collectionId: string;
  vectorIndexName: string;
  vectorField: string;
  metadataField: string;
  textField: string;
  vectorDimension: string;
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
        runtime: lambda.Runtime.NODEJS_20_X,
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

interface RagKnowledgeBaseStackProps extends StackProps {
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

    const embeddingModelId: string | null | undefined =
      this.node.tryGetContext('embeddingModelId')!;

    if (typeof embeddingModelId !== 'string') {
      throw new Error(
        'The Knowledge Base RAG is enabled, but the embeddingModelId is not specified.'
      );
    }

    if (!EMBEDDING_MODELS.includes(embeddingModelId)) {
      throw new Error(
        `embeddingModelId is an invalid value (valid embeddingModelId ${EMBEDDING_MODELS})`
      );
    }

    const collectionName = props.collectionName ?? 'generative-ai-use-cases-jp';
    const vectorIndexName =
      props.vectorIndexName ?? 'bedrock-knowledge-base-default';
    const vectorField =
      props.vectorField ?? 'bedrock-knowledge-base-default-vector';
    const textField = props.textField ?? 'AMAZON_BEDROCK_TEXT_CHUNK';
    const metadataField = props.metadataField ?? 'AMAZON_BEDROCK_METADATA';

    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    });

    const standbyReplicas = this.node.tryGetContext(
      'ragKnowledgeBaseStandbyReplicas'
    );

    const ragKnowledgeBaseAdvancedParsing = this.node.tryGetContext(
      'ragKnowledgeBaseAdvancedParsing'
    )!;

    const ragKnowledgeBaseAdvancedParsingModelId: string | null | undefined =
      this.node.tryGetContext('ragKnowledgeBaseAdvancedParsingModelId')!;

    if (
      ragKnowledgeBaseAdvancedParsing &&
      typeof ragKnowledgeBaseAdvancedParsingModelId !== 'string'
    ) {
      throw new Error(
        "The Knowledge Base RAG's Advanced Parsing is enabled, but the ragKnowledgeBaseAdvancedParsingModelId is not specified or is not a string."
      );
    }

    const collection = new oss.CfnCollection(this, 'Collection', {
      name: collectionName,
      description: 'GenU Collection',
      type: 'VECTORSEARCH',
      standbyReplicas: standbyReplicas ? 'ENABLED' : 'DISABLED',
    });

    const ossIndex = new OpenSearchServerlessIndex(this, 'OssIndex', {
      collectionId: collection.ref,
      vectorIndexName,
      vectorField,
      textField,
      metadataField,
      vectorDimension: MODEL_VECTOR_MAPPING[embeddingModelId],
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

    const dataSourceBucket = new s3.Bucket(this, 'DataSourceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
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
        // If you want to change the chunking strategy, uncomment the following and adjust the various parameters to configure the environment to suit your needs.
        // You can choose from the following four chunking strategies:
        // - Default (no specification)
        // - Semantic chunking
        // - Hierarchical chunking
        // - Standard chunking
        // For details, please refer to the following document.
        // https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html
        // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnDataSource.ChunkingConfigurationProperty.html
        //
        // Semantic chunking
        // chunkingConfiguration: {
        //   chunkingStrategy: 'SEMANTIC',
        //   semanticChunkingConfiguration: {
        //     maxTokens: 300,
        //     bufferSize: 0,
        //     breakpointPercentileThreshold: 95,
        //   },
        // },
        //
        // Hierarchical chunking
        // chunkingConfiguration: {
        //   chunkingStrategy: 'HIERARCHICAL',
        //   hierarchicalChunkingConfiguration: {
        //     levelConfigurations: [
        //       {
        //         maxTokens: 1500, // Max token size of parent chunk
        //       },
        //       {
        //         maxTokens: 300, // Max token size of child chunk
        //       },
        //     ],
        //     overlapTokens: 60,
        //   },
        // },
        //
        // Standard chunking
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
      exclude: ['AccessLogs/*'],
    });

    this.knowledgeBaseId = knowledgeBase.ref;
    this.dataSourceBucketName = dataSourceBucket.bucketName;
  }
}
