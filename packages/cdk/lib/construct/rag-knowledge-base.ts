import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as oss from 'aws-cdk-lib/aws-opensearchserverless';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const UUID = '73A9FD8B-CA85-46CA-972A-FE85F735A084';

interface OpenSearchServerlessIndexProps {
  collectionId: string;
  vectorIndexName: string;
  vectorField: string;
  metadataField: string;
  textField: string;
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

export interface RagKnowledgeBaseProps {
  collectionName?: string;
  vectorIndexName?: string;
  vectorField?: string;
  metadataField?: string;
  textField?: string;
}

export class RagKnowledgeBase extends Construct {
  constructor(scope: Construct, id: string, props: RagKnowledgeBaseProps) {
    super(scope, id);

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

    const collection = new oss.CfnCollection(this, 'Collection', {
      name: collectionName,
      type: 'VECTORSEARCH',
    });

    const ossIndex = new OpenSearchServerlessIndex(this, 'OssIndex', {
      collectionId: collection.ref,
      vectorIndexName,
      vectorField,
      textField,
      metadataField,
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
      enforceSSL: true,
    });

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/amazon.titan-embed-text-v1`,
        ],
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
          embeddingModelArn: `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/amazon.titan-embed-text-v1`,
        },
      },
    });

    // TODO: 次のリリースで CfnKnowledgeBase に追加される
    knowledgeBase.addPropertyOverride('StorageConfiguration', {
      OpensearchServerlessConfiguration: {
        CollectionArn: cdk.Token.asString(collection.getAtt('Arn')),
        FieldMapping: {
          MetadataField: metadataField,
          TextField: textField,
          VectorField: vectorField,
        },
        VectorIndexName: vectorIndexName,
      },
      Type: 'OPENSEARCH_SERVERLESS',
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

    knowledgeBase.addDependency(collection);
    knowledgeBase.node.addDependency(ossIndex.customResource);

    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./kendra-docs')],
      destinationBucket: dataSourceBucket,
    });
  }
}
