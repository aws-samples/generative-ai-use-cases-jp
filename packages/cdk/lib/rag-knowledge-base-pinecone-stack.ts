import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import {MetadataJsonGeneratorConstruct, CopyObjectConstruct, VectorStoreSecretsConstruct} from './construct';

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

const EMBEDDING_MODELS = Object.keys(MODEL_VECTOR_MAPPING);


interface RagKnowledgeBasePineconeStackProps extends StackProps {
  collectionName?: string;
  vectorIndexName?: string;
  vectorField?: string;
  metadataField?: string;
  textField?: string;
}

export class RagKnowledgeBasePineconeStack extends Stack {
  public readonly knowledgeBaseId: string;
  public readonly dataSourceBucketName: string;
  public readonly registryName: string;
  public readonly schemaName: string;

  constructor(scope: Construct, id: string, props: RagKnowledgeBasePineconeStackProps) {
    super(scope, id, props);

    const embeddingModelId: string | null | undefined =
      this.node.tryGetContext('embeddingModelId')!;

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

    const collectionName = props.collectionName ?? 'generative-ai-use-cases-jp';
    const vectorIndexName =
      props.vectorIndexName ?? 'bedrock-knowledge-base-default';
    const vectorField =
      props.vectorField ?? 'bedrock-knowledge-base-default-vector';
    const textField = props.textField ?? 'AMAZON_BEDROCK_TEXT_CHUNK';
    const metadataField = props.metadataField ?? 'AMAZON_BEDROCK_METADATA';

    // PineconeのApiキーを取得する
    const vectorStoreSecretsConstruct = new VectorStoreSecretsConstruct(this, 'VectorStoreSecretsConstruct',{})
    const vectorStoreUrl = vectorStoreSecretsConstruct.vectorStoreUrl;
    const vectorStoreSecret = vectorStoreSecretsConstruct.vectorStoreSecret
    if (!vectorStoreSecret.secretFullArn) {
      throw new Error("Secret ARN is undefined");
    };
    // インラインポリシーでシークレットを取得する
    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        'AllowGetSecretValue': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              resources: [vectorStoreSecret.secretFullArn],
              actions: ['secretsmanager:GetSecretValue'],
            }),
          ],
        }),
      },
    });
    vectorStoreUrl.grantRead(knowledgeBaseRole);
    vectorStoreSecret.grantRead(knowledgeBaseRole);


    const dataSourceBucket = new s3.Bucket(this, 'DataSourceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      // serverAccessLogsPrefix: 'AccessLogs/',
      enforceSSL: true,
    });

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/${embeddingModelId}`,
        ],
        actions: ['bedrock:InvokeModel'],
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
        type: "PINECONE", // ストレージのタイプをPineconeに設定
        pineconeConfiguration: {
          connectionString: vectorStoreUrl.stringValue, // Pineconeの接続文字列を設定
          credentialsSecretArn: vectorStoreSecret.secretFullArn, // PineconeのAPIキーシークレットのARNを設定
          fieldMapping: {
            metadataField: "metadata", // メタデータフィールドを設定
            textField: "text", // テキストフィールドを設定
          },
        },
      },
    });

    new bedrock.CfnDataSource(this, 'DataSource', {
      dataSourceConfiguration: {
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${dataSourceBucket.bucketName}`,
          inclusionPrefixes: ['docs'],
        },
        type: 'S3',
      },
      knowledgeBaseId: knowledgeBase.ref,
      name: 's3-data-source',
    });

    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./rag-docs')],
      destinationBucket: dataSourceBucket,
    });

    // PDF files Bucket
    const rawTextFileBucket = new s3.Bucket(this, 'rawTextFileBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
      eventBridgeEnabled: true,
    });
    // Too Use を使用できるモデルを選ぶ
    const model = bedrock.FoundationModel.fromFoundationModelId(
      this,
      'Model',
      bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_3_SONNET_20240229_V1_0,
    );
    
    const metadataJsonGeneratorConstruct = new MetadataJsonGeneratorConstruct(this, 'metadataJsonGeneratorConstruct', {
      model: model,
      sourceBucket: rawTextFileBucket,
    });
    const copyObjectConstruct = new CopyObjectConstruct(this, "copyObjectConstruct", {
      knowledgeBaseId: knowledgeBase.ref,
      sourceBucket: rawTextFileBucket
    })
    
    this.knowledgeBaseId = knowledgeBase.ref;
    this.dataSourceBucketName = dataSourceBucket.bucketName;
  }
}
