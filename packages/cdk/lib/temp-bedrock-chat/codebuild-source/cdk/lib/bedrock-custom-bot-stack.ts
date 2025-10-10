import * as cdk from 'aws-cdk-lib';
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock';
import { ChunkingStrategy } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/chunking';
import {
  CrawlingScope,
  CrawlingFilters,
} from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/web-crawler-data-source';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import * as custom_resources from 'aws-cdk-lib/custom-resources';
import {
  AwsCustomResource,
  PhysicalResourceId,
  AwsCustomResourcePolicy,
} from 'aws-cdk-lib/custom-resources';
import { getThreshold } from './utils/bedrock-guardrails';

const BLOCKED_INPUT_MESSAGE = 'this input message is blocked';
const BLOCKED_OUTPUT_MESSAGE = 'this output message is blocked';

interface BedrockGuardrailProps {
  readonly is_guardrail_enabled?: boolean;
  readonly hateThreshold?: number;
  readonly insultsThreshold?: number;
  readonly sexualThreshold?: number;
  readonly violenceThreshold?: number;
  readonly misconductThreshold?: number;
  readonly groundingThreshold?: number;
  readonly relevanceThreshold?: number;
  readonly guardrailArn?: number;
  readonly guardrailVersion?: number;
}

interface BedrockCustomBotStackProps extends StackProps {
  // Base configuration
  readonly ownerUserId: string;
  readonly botId: string;
  readonly bedrockClaudeChatDocumentBucketName: string;
  readonly enableRagReplicas?: boolean;

  // Knowledge base configuration
  readonly embeddingsModel: BedrockFoundationModel;
  readonly parsingModel?: BedrockFoundationModel;
  readonly existKnowledgeBaseId: string | undefined;
  readonly existingS3Urls: string[];
  readonly sourceUrls: string[];
  readonly instruction?: string;

  // Chunking configuration
  readonly chunkingStrategy: ChunkingStrategy;
  readonly maxTokens?: number;
  readonly overlapPercentage?: number;

  // Crawling configuration
  readonly crawlingScope?: CrawlingScope;
  readonly crawlingFilters?: CrawlingFilters;

  // Guardrail configuration
  readonly guardrail?: BedrockGuardrailProps;
}

export class BedrockCustomBotStack extends Stack {
  constructor(scope: Construct, id: string, props: BedrockCustomBotStackProps) {
    super(scope, id, props);

    const { docBucketsAndPrefixes } = this.setupBucketsAndPrefixes(props);

    let knowledgeBaseIdOutput: string;
    let knowledgeBaseArnOutput: string;
    let kbRole: iam.Role | undefined;

    // if knowledge base arn does not exist
    if (props.existKnowledgeBaseId == undefined) {
      // Check if managed OpenSearch domain is available
      const openSearchEndpoint = process.env.OPENSEARCH_DOMAIN_ENDPOINT;
      const openSearchArn = process.env.OPENSEARCH_DOMAIN_ARN;

      if (!openSearchEndpoint || !openSearchArn) {
        throw new Error(
          'Managed OpenSearch domain endpoint and ARN must be provided via environment variables'
        );
      }

      // Use managed OpenSearch domain
      console.log(`Using managed OpenSearch domain: ${openSearchEndpoint}`);
      const indexName = `kb-${props.botId.slice(0, 20).toLowerCase()}`;

      // Create IAM role for Knowledge Base
      kbRole = new iam.Role(this, 'KnowledgeBaseRole', {
        assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
        description: 'Role for Bedrock Knowledge Base to access OpenSearch',
      });

      // Grant OpenSearch permissions
      kbRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'es:ESHttpPost',
            'es:ESHttpPut',
            'es:ESHttpDelete',
            'es:ESHttpGet',
            'es:ESHttpHead',
          ],
          resources: [`${openSearchArn}/*`],
        })
      );

      kbRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['es:DescribeDomain'],
          resources: [`${openSearchArn}`],
        })
      );

      // Grant Bedrock permissions
      kbRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:InvokeModel'],
          resources: [props.embeddingsModel.asArn(this)],
        })
      );

      // Create index using Lambda-backed custom resource
      const indexCreator = new lambda.Function(this, 'IndexCreator', {
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
import json
import boto3
from urllib.parse import urlparse

def handler(event, context):
    print(json.dumps(event))
    request_type = event['RequestType']

    domain_endpoint = event['ResourceProperties']['DomainEndpoint']
    index_name = event['ResourceProperties']['IndexName']
    vector_dimensions = int(event['ResourceProperties']['VectorDimensions'])
    region = event['ResourceProperties']['Region']

    # Parse domain endpoint to get host
    parsed_url = urlparse(domain_endpoint)
    host = parsed_url.netloc if parsed_url.netloc else domain_endpoint.replace('https://', '').replace('/', '')

    # Use requests with AWS SigV4 authentication
    from botocore.awsrequest import AWSRequest
    from botocore.auth import SigV4Auth
    from botocore.httpsession import URLLib3Session

    credentials = boto3.Session().get_credentials()

    if request_type == 'Create' or request_type == 'Update':
        try:
            # Prepare index settings
            index_body = {
                "settings": {
                    "index": {
                        "knn": True,
                        "number_of_shards": 2,
                        "number_of_replicas": 1
                    }
                },
                "mappings": {
                    "properties": {
                        "bedrock-knowledge-base-default-vector": {
                            "type": "knn_vector",
                            "dimension": vector_dimensions,
                            "method": {
                                "name": "hnsw",
                                "space_type": "l2",
                                "engine": "faiss",
                                "parameters": {
                                    "ef_construction": 256,
                                    "m": 24
                                }
                            }
                        },
                        "AMAZON_BEDROCK_TEXT_CHUNK": {
                            "type": "text",
                            "index": True
                        },
                        "AMAZON_BEDROCK_METADATA": {
                            "type": "text",
                            "index": False
                        }
                    }
                }
            }

            # Create index using HTTP request with SigV4 auth
            http = URLLib3Session()
            request = AWSRequest(
                method='PUT',
                url=f'https://{host}/{index_name}',
                data=json.dumps(index_body),
                headers={'Content-Type': 'application/json'}
            )
            SigV4Auth(credentials, 'es', region).add_auth(request)

            response = http.send(request.prepare())
            print(f"Index creation response: {response.status_code} - {response.text}")

            if response.status_code not in [200, 201]:
                # Check if index already exists
                check_request = AWSRequest(method='HEAD', url=f'https://{host}/{index_name}')
                SigV4Auth(credentials, 'es', region).add_auth(check_request)
                check_response = http.send(check_request.prepare())

                if check_response.status_code == 200:
                    print(f"Index {index_name} already exists")
                else:
                    raise Exception(f"Failed to create index: {response.text}")

        except Exception as e:
            print(f"Error: {e}")
            raise

    elif request_type == 'Delete':
        # Skip deletion for managed OpenSearch
        print(f"Skipping index deletion for managed OpenSearch")

    return {
        'StatusCode': 200,
        'Data': {'IndexName': index_name}
    }
          `),
        timeout: cdk.Duration.minutes(5),
      });

      // Grant permissions to the Lambda function
      indexCreator.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'es:ESHttpPost',
            'es:ESHttpPut',
            'es:ESHttpDelete',
            'es:ESHttpGet',
            'es:ESHttpHead',
          ],
          resources: [`${openSearchArn}/*`],
        })
      );

      // Create custom resource for index
      const indexResource = new cdk.CustomResource(this, 'OpenSearchIndex', {
        serviceToken: new custom_resources.Provider(this, 'IndexProvider', {
          onEventHandler: indexCreator,
        }).serviceToken,
        properties: {
          DomainEndpoint: openSearchEndpoint,
          IndexName: indexName,
          VectorDimensions: props.embeddingsModel.vectorDimensions!,
          Region: this.region,
        },
      });

      // Create Knowledge Base using CfnKnowledgeBase
      const knowledgeBase = new bedrock.CfnKnowledgeBase(
        this,
        'KnowledgeBase',
        {
          name: `${props.ownerUserId}-${props.botId}`,
          roleArn: kbRole.roleArn,
          knowledgeBaseConfiguration: {
            type: 'VECTOR',
            vectorKnowledgeBaseConfiguration: {
              embeddingModelArn: props.embeddingsModel.asArn(this),
              embeddingModelConfiguration: {
                bedrockEmbeddingModelConfiguration: {
                  dimensions: props.embeddingsModel.vectorDimensions,
                },
              },
            },
          },
          storageConfiguration: {
            type: 'OPENSEARCH_MANAGED_CLUSTER',
            opensearchManagedClusterConfiguration: {
              domainArn: openSearchArn,
              domainEndpoint: `https://${openSearchEndpoint}`,
              vectorIndexName: indexName,
              fieldMapping: {
                vectorField: 'bedrock-knowledge-base-default-vector',
                textField: 'AMAZON_BEDROCK_TEXT_CHUNK',
                metadataField: 'AMAZON_BEDROCK_METADATA',
              },
            },
          },
          description: props.instruction,
        }
      );

      // Ensure index is created before knowledge base
      knowledgeBase.node.addDependency(indexResource);
      // Ensure IAM role and its policies are fully created before knowledge base
      knowledgeBase.node.addDependency(kbRole);

      // Get knowledge base ID and ARN from CfnKnowledgeBase
      const knowledgeBaseId = knowledgeBase.attrKnowledgeBaseId;
      const knowledgeBaseArn = knowledgeBase.attrKnowledgeBaseArn;

      // Set output values
      knowledgeBaseIdOutput = knowledgeBaseId;
      knowledgeBaseArnOutput = knowledgeBaseArn;

      // Create S3 data sources using AwsCustomResource
      const dataSources: AwsCustomResource[] = [];

      docBucketsAndPrefixes.forEach(({ bucket, prefix }, index) => {
        bucket.grantRead(kbRole!);
        const inclusionPrefixes = prefix === '' ? undefined : [prefix];

        const dataSource = new AwsCustomResource(
          this,
          `CreateS3DataSource${index}`,
          {
            onCreate: {
              service: 'bedrock-agent',
              action: 'createDataSource',
              parameters: {
                knowledgeBaseId: knowledgeBaseId,
                name: `${bucket.bucketName}-${index}`,
                dataSourceConfiguration: {
                  type: 'S3',
                  s3Configuration: {
                    bucketArn: bucket.bucketArn,
                    inclusionPrefixes: inclusionPrefixes,
                  },
                },
                vectorIngestionConfiguration: {
                  chunkingConfiguration: this.buildChunkingConfiguration(
                    props.chunkingStrategy,
                    props.maxTokens,
                    props.overlapPercentage
                  ),
                  parsingConfiguration: props.parsingModel
                    ? {
                        parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
                        bedrockFoundationModelConfiguration: {
                          modelArn: props.parsingModel.asArn(this),
                        },
                      }
                    : undefined,
                },
              },
              physicalResourceId: PhysicalResourceId.fromResponse(
                'dataSource.dataSourceId'
              ),
            },
            onDelete: {
              service: 'bedrock-agent',
              action: 'deleteDataSource',
              parameters: {
                knowledgeBaseId: knowledgeBaseId,
                dataSourceId: PhysicalResourceId.fromResponse(
                  'dataSource.dataSourceId'
                ),
              },
            },
            policy: AwsCustomResourcePolicy.fromStatements([
              new iam.PolicyStatement({
                actions: [
                  'bedrock:CreateDataSource',
                  'bedrock:DeleteDataSource',
                  'bedrock:UpdateDataSource',
                  'bedrock:GetDataSource',
                ],
                resources: ['*'],
              }),
            ]),
          }
        );

        // Ensure data source is created after knowledge base
        dataSource.node.addDependency(knowledgeBase);
        dataSources.push(dataSource);
      });

      // Add Web Crawler Data Sources using AwsCustomResource
      if (props.sourceUrls.length > 0) {
        const webCrawlerDataSource = new AwsCustomResource(
          this,
          'CreateWebCrawlerDataSource',
          {
            onCreate: {
              service: 'bedrock-agent',
              action: 'createDataSource',
              parameters: {
                knowledgeBaseId: knowledgeBaseId,
                name: 'WebCrawlerDataSource',
                dataSourceConfiguration: {
                  type: 'WEB',
                  webConfiguration: {
                    sourceConfiguration: {
                      urlConfiguration: {
                        seedUrls: props.sourceUrls.map((url) => ({ url })),
                      },
                    },
                    crawlerConfiguration: {
                      crawlerLimits: {
                        rateLimit: 300,
                      },
                      scope: props.crawlingScope || 'HOST_ONLY',
                      excludePatterns: props.crawlingFilters?.excludePatterns,
                      includePatterns: props.crawlingFilters?.includePatterns,
                    },
                  },
                },
                vectorIngestionConfiguration: {
                  chunkingConfiguration: this.buildChunkingConfiguration(
                    props.chunkingStrategy,
                    props.maxTokens,
                    props.overlapPercentage
                  ),
                  parsingConfiguration: props.parsingModel
                    ? {
                        parsingStrategy: 'BEDROCK_FOUNDATION_MODEL',
                        bedrockFoundationModelConfiguration: {
                          modelArn: props.parsingModel.asArn(this),
                        },
                      }
                    : undefined,
                },
              },
              physicalResourceId: PhysicalResourceId.fromResponse(
                'dataSource.dataSourceId'
              ),
            },
            onDelete: {
              service: 'bedrock-agent',
              action: 'deleteDataSource',
              parameters: {
                knowledgeBaseId: knowledgeBaseId,
                dataSourceId: PhysicalResourceId.fromResponse(
                  'dataSource.dataSourceId'
                ),
              },
            },
            policy: AwsCustomResourcePolicy.fromStatements([
              new iam.PolicyStatement({
                actions: [
                  'bedrock:CreateDataSource',
                  'bedrock:DeleteDataSource',
                  'bedrock:UpdateDataSource',
                  'bedrock:GetDataSource',
                ],
                resources: ['*'],
              }),
            ]),
          }
        );

        // Ensure data source is created after knowledge base
        webCrawlerDataSource.node.addDependency(knowledgeBase);
        dataSources.push(webCrawlerDataSource);

        new CfnOutput(this, 'DataSourceIdWebCrawler', {
          value: webCrawlerDataSource.getResponseField(
            'dataSource.dataSourceId'
          ),
        });
      }

      if (props.guardrail?.is_guardrail_enabled == true) {
        // Use only parameters with a value greater than or equal to 0
        let contentPolicyConfigFiltersConfig = [];
        let contextualGroundingFiltersConfig = [];
        console.log('props.guardrail: ', props.guardrail);

        if (
          props.guardrail.hateThreshold != undefined &&
          props.guardrail.hateThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.hateThreshold),
            outputStrength: getThreshold(props.guardrail.hateThreshold),
            type: 'HATE',
          });
        }

        if (
          props.guardrail.insultsThreshold != undefined &&
          props.guardrail.insultsThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.insultsThreshold),
            outputStrength: getThreshold(props.guardrail.insultsThreshold),
            type: 'INSULTS',
          });
        }

        if (
          props.guardrail.sexualThreshold != undefined &&
          props.guardrail.sexualThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.sexualThreshold),
            outputStrength: getThreshold(props.guardrail.sexualThreshold),
            type: 'SEXUAL',
          });
        }

        if (
          props.guardrail.violenceThreshold != undefined &&
          props.guardrail.violenceThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.violenceThreshold),
            outputStrength: getThreshold(props.guardrail.violenceThreshold),
            type: 'VIOLENCE',
          });
        }

        if (
          props.guardrail.misconductThreshold != undefined &&
          props.guardrail.misconductThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.misconductThreshold),
            outputStrength: getThreshold(props.guardrail.misconductThreshold),
            type: 'MISCONDUCT',
          });
        }

        if (
          props.guardrail.groundingThreshold != undefined &&
          props.guardrail.groundingThreshold > 0
        ) {
          contextualGroundingFiltersConfig.push({
            threshold: props.guardrail.groundingThreshold!,
            type: 'GROUNDING',
          });
        }

        if (
          props.guardrail.relevanceThreshold != undefined &&
          props.guardrail.relevanceThreshold > 0
        ) {
          contextualGroundingFiltersConfig.push({
            threshold: props.guardrail.relevanceThreshold!,
            type: 'RELEVANCE',
          });
        }

        console.log(
          'contentPolicyConfigFiltersConfig: ',
          contentPolicyConfigFiltersConfig
        );
        console.log(
          'contextualGroundingFiltersConfig: ',
          contextualGroundingFiltersConfig
        );

        // Deploy Guardrail if it contains at least one configuration value
        if (
          contentPolicyConfigFiltersConfig.length > 0 ||
          contextualGroundingFiltersConfig.length > 0
        ) {
          const guardrail = new bedrock.CfnGuardrail(this, 'Guardrail', {
            name: props.botId,
            blockedInputMessaging: BLOCKED_INPUT_MESSAGE,
            blockedOutputsMessaging: BLOCKED_OUTPUT_MESSAGE,
            contentPolicyConfig:
              contentPolicyConfigFiltersConfig.length > 0
                ? {
                    filtersConfig: contentPolicyConfigFiltersConfig,
                  }
                : undefined,
            contextualGroundingPolicyConfig:
              contextualGroundingFiltersConfig.length > 0
                ? {
                    filtersConfig: contextualGroundingFiltersConfig,
                  }
                : undefined,
          });
          new CfnOutput(this, 'GuardrailArn', {
            value: guardrail.attrGuardrailArn,
          });
          new CfnOutput(this, 'GuardrailVersion', {
            value: guardrail.attrVersion,
          });
        }
      }

      // This output is used by Sfn to synchronize KB data.
      dataSources.forEach((dataSource, index) => {
        new CfnOutput(this, `DataSource${index}`, {
          value: dataSource.getResponseField('dataSource.dataSourceId'),
        });
      });
    } else {
      // if knowledgeBaseArn exists
      const getKnowledgeBase = new AwsCustomResource(this, 'GetKnowledgeBase', {
        onCreate: {
          service: 'bedrock-agent',
          action: 'getKnowledgeBase',
          parameters: {
            knowledgeBaseId: props.existKnowledgeBaseId,
          },
          physicalResourceId: PhysicalResourceId.of(props.existKnowledgeBaseId),
        },
        policy: AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ['bedrock:GetKnowledgeBase'],
            resources: [
              `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.existKnowledgeBaseId}`,
            ],
          }),
        ]),
      });

      // Set output values for existing knowledge base
      knowledgeBaseIdOutput = props.existKnowledgeBaseId;
      knowledgeBaseArnOutput = `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.existKnowledgeBaseId}`;
    }

    new CfnOutput(this, 'KnowledgeBaseId', {
      value: knowledgeBaseIdOutput,
    });
    new CfnOutput(this, 'KnowledgeBaseArn', {
      value: knowledgeBaseArnOutput,
    });
    new CfnOutput(this, 'OwnerUserId', {
      value: props.ownerUserId,
    });
    new CfnOutput(this, 'BotId', {
      value: props.botId,
    });
  }

  private setupBucketsAndPrefixes(props: BedrockCustomBotStackProps): {
    docBucketsAndPrefixes: { bucket: s3.IBucket; prefix: string }[];
  } {
    /**
     * Setup the document buckets and prefixes based on the provided properties.
     *
     * This method processes the provided existing bucket URLs and sets up the
     * S3 buckets and inclusion prefixes accordingly. It always includes the
     * default bedrockClaudeChatDocumentBucketName in the list of document buckets.
     *
     * @param props The properties passed to the stack, including existing bucket URLs, owner user ID, and bot ID.
     * @returns An object containing the list of document buckets and extracted prefixes.
     */
    const docBucketsAndPrefixes: { bucket: s3.IBucket; prefix: string }[] = [];

    // Always add the default bucket with its default prefix
    docBucketsAndPrefixes.push({
      bucket: s3.Bucket.fromBucketName(
        this,
        props.bedrockClaudeChatDocumentBucketName,
        props.bedrockClaudeChatDocumentBucketName
      ),
      prefix: `${props.ownerUserId}/${props.botId}/documents/`,
    });

    if (props.existingS3Urls && props.existingS3Urls.length > 0) {
      props.existingS3Urls.forEach((url) => {
        const { bucketName, prefix } = this.parseS3Url(url);
        docBucketsAndPrefixes.push({
          bucket: s3.Bucket.fromBucketName(this, bucketName, bucketName),
          prefix: prefix,
        });
      });
    }

    return { docBucketsAndPrefixes };
  }

  private buildChunkingConfiguration(
    chunkingStrategy?: ChunkingStrategy,
    maxTokens?: number,
    overlapPercentage?: number
  ): any {
    if (!chunkingStrategy) {
      return {
        chunkingStrategy: 'FIXED_SIZE',
        fixedSizeChunkingConfiguration: {
          maxTokens: 300,
          overlapPercentage: 10,
        },
      };
    }

    // Convert ChunkingStrategy to API format
    const strategyType = (chunkingStrategy as any).chunkingStrategy;

    if (strategyType === 'FIXED_SIZE') {
      return {
        chunkingStrategy: 'FIXED_SIZE',
        fixedSizeChunkingConfiguration: {
          maxTokens: maxTokens || 300,
          overlapPercentage: overlapPercentage || 10,
        },
      };
    } else if (strategyType === 'SEMANTIC') {
      return {
        chunkingStrategy: 'SEMANTIC',
        semanticChunkingConfiguration: {
          maxTokens: maxTokens || 300,
          bufferSize: 0,
          breakpointPercentileThreshold: 95,
        },
      };
    } else if (strategyType === 'HIERARCHICAL') {
      return {
        chunkingStrategy: 'HIERARCHICAL',
        hierarchicalChunkingConfiguration: {
          levelConfigurations: [
            {
              maxTokens: 2048,
              overlapTokens: 400,
            },
            {
              maxTokens: 500,
              overlapTokens: 100,
            },
          ],
        },
      };
    } else {
      // Default to FIXED_SIZE
      return {
        chunkingStrategy: 'FIXED_SIZE',
        fixedSizeChunkingConfiguration: {
          maxTokens: maxTokens || 300,
          overlapPercentage: overlapPercentage || 10,
        },
      };
    }
  }

  private parseS3Url(url: string): { bucketName: string; prefix: string } {
    console.info(`Parsing S3 URL: ${url}`);
    if (!url.startsWith('s3://')) {
      throw new Error(`Invalid S3 URL format: ${url}`);
    }

    const urlParts = url.replace('s3://', '').split('/');
    if (urlParts.length < 1) {
      throw new Error(`Invalid S3 URL format: ${url}`);
    }

    const bucketName = urlParts.shift()!;
    const prefix = urlParts.join('/');
    console.info(`Parsed S3 URL: bucketName=${bucketName}, prefix=${prefix}`);
    return { bucketName, prefix };
  }
}
