import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { VectorCollection } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/opensearchserverless";
import {
  Analyzer,
  VectorIndex,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/opensearch-vectorindex";
import { VectorCollectionStandbyReplicas } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/opensearchserverless";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { BedrockFoundationModel } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { ChunkingStrategy } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/chunking";
import { S3DataSource } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/s3-data-source";
import {
  WebCrawlerDataSource,
  CrawlingScope,
  CrawlingFilters,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/web-crawler-data-source";
import { ParsingStategy } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/parsing";

import {
  KnowledgeBase,
  IKnowledgeBase,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { aws_bedrock as bedrock } from "aws-cdk-lib";
import {
  AwsCustomResource,
  PhysicalResourceId,
  AwsCustomResourcePolicy,
} from "aws-cdk-lib/custom-resources";
import { getThreshold } from "./utils/bedrock-guardrails";

const BLOCKED_INPUT_MESSAGE = "this input message is blocked";
const BLOCKED_OUTPUT_MESSAGE = "this output message is blocked";

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
  readonly analyzer?: Analyzer;

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

    let kb: IKnowledgeBase;

    // if knowledge base arn does not exist
    if (props.existKnowledgeBaseId == undefined) {
      const vectorCollection = new VectorCollection(this, "KBVectors", {
        collectionName: `kb-${props.botId.slice(0, 20).toLowerCase()}`,
        standbyReplicas:
          props.enableRagReplicas === true
            ? VectorCollectionStandbyReplicas.ENABLED
            : VectorCollectionStandbyReplicas.DISABLED,
      });
      const vectorIndex = new VectorIndex(this, "KBIndex", {
        collection: vectorCollection,
        // DO NOT CHANGE THIS VALUE
        indexName: "bedrock-knowledge-base-default-index",
        // DO NOT CHANGE THIS VALUE
        vectorField: "bedrock-knowledge-base-default-vector",
        vectorDimensions: props.embeddingsModel.vectorDimensions!,
        mappings: [
          {
            mappingField: "AMAZON_BEDROCK_TEXT_CHUNK",
            dataType: "text",
            filterable: true,
          },
          {
            mappingField: "AMAZON_BEDROCK_METADATA",
            dataType: "text",
            filterable: false,
          },
        ],
        analyzer: props.analyzer,
      });

      kb = new KnowledgeBase(this, "KB", {
        embeddingsModel: props.embeddingsModel,
        vectorStore: vectorCollection,
        vectorIndex: vectorIndex,
        instruction: props.instruction,
      });

      const dataSources = docBucketsAndPrefixes.map(({ bucket, prefix }) => {
        bucket.grantRead(kb.role);
        const inclusionPrefixes = prefix === "" ? undefined : [prefix];
        return new S3DataSource(this, `DataSource${prefix}`, {
          bucket: bucket,
          knowledgeBase: kb,
          dataSourceName: bucket.bucketName,
          chunkingStrategy: props.chunkingStrategy,
          parsingStrategy: props.parsingModel
            ? ParsingStategy.foundationModel({
                parsingModel: props.parsingModel.asIModel(this),
              })
            : undefined,
          inclusionPrefixes: inclusionPrefixes,
        });
      });

      // Add Web Crawler Data Sources
      if (props.sourceUrls.length > 0) {
        const webCrawlerDataSource = new WebCrawlerDataSource(
          this,
          "WebCrawlerDataSource",
          {
            knowledgeBase: kb,
            sourceUrls: props.sourceUrls,
            chunkingStrategy: props.chunkingStrategy,
            parsingStrategy: props.parsingModel
              ? ParsingStategy.foundationModel({
                  parsingModel: props.parsingModel.asIModel(this),
                })
              : undefined,
            crawlingScope: props.crawlingScope,
            filters: {
              excludePatterns: props.crawlingFilters?.excludePatterns,
              includePatterns: props.crawlingFilters?.includePatterns,
            },
          }
        );
        new CfnOutput(this, "DataSourceIdWebCrawler", {
          value: webCrawlerDataSource.dataSourceId,
        });
      }

      if (props.guardrail?.is_guardrail_enabled == true) {
        // Use only parameters with a value greater than or equal to 0
        let contentPolicyConfigFiltersConfig = [];
        let contextualGroundingFiltersConfig = [];
        console.log("props.guardrail: ", props.guardrail);

        if (
          props.guardrail.hateThreshold != undefined &&
          props.guardrail.hateThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.hateThreshold),
            outputStrength: getThreshold(props.guardrail.hateThreshold),
            type: "HATE",
          });
        }

        if (
          props.guardrail.insultsThreshold != undefined &&
          props.guardrail.insultsThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.insultsThreshold),
            outputStrength: getThreshold(props.guardrail.insultsThreshold),
            type: "INSULTS",
          });
        }

        if (
          props.guardrail.sexualThreshold != undefined &&
          props.guardrail.sexualThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.sexualThreshold),
            outputStrength: getThreshold(props.guardrail.sexualThreshold),
            type: "SEXUAL",
          });
        }

        if (
          props.guardrail.violenceThreshold != undefined &&
          props.guardrail.violenceThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.violenceThreshold),
            outputStrength: getThreshold(props.guardrail.violenceThreshold),
            type: "VIOLENCE",
          });
        }

        if (
          props.guardrail.misconductThreshold != undefined &&
          props.guardrail.misconductThreshold > 0
        ) {
          contentPolicyConfigFiltersConfig.push({
            inputStrength: getThreshold(props.guardrail.misconductThreshold),
            outputStrength: getThreshold(props.guardrail.misconductThreshold),
            type: "MISCONDUCT",
          });
        }

        if (
          props.guardrail.groundingThreshold != undefined &&
          props.guardrail.groundingThreshold > 0
        ) {
          contextualGroundingFiltersConfig.push({
            threshold: props.guardrail.groundingThreshold!,
            type: "GROUNDING",
          });
        }

        if (
          props.guardrail.relevanceThreshold != undefined &&
          props.guardrail.relevanceThreshold > 0
        ) {
          contextualGroundingFiltersConfig.push({
            threshold: props.guardrail.relevanceThreshold!,
            type: "RELEVANCE",
          });
        }

        console.log(
          "contentPolicyConfigFiltersConfig: ",
          contentPolicyConfigFiltersConfig
        );
        console.log(
          "contextualGroundingFiltersConfig: ",
          contextualGroundingFiltersConfig
        );

        // Deploy Guardrail if it contains at least one configuration value
        if (
          contentPolicyConfigFiltersConfig.length > 0 ||
          contextualGroundingFiltersConfig.length > 0
        ) {
          const guardrail = new bedrock.CfnGuardrail(this, "Guardrail", {
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
          new CfnOutput(this, "GuardrailArn", {
            value: guardrail.attrGuardrailArn,
          });
          new CfnOutput(this, "GuardrailVersion", {
            value: guardrail.attrVersion,
          });
        }
      }

      // This output is used by Sfn to synchronize KB data.
      dataSources.forEach((dataSource, index) => {
        new CfnOutput(this, `DataSource${index}`, {
          value: dataSource.dataSourceId,
        });
      });
    } else {
      // if knowledgeBaseArn exists
      const getKnowledgeBase = new AwsCustomResource(this, "GetKnowledgeBase", {
        onCreate: {
          service: "bedrock-agent",
          action: "GetKnowledgeBase",
          parameters: {
            knowledgeBaseId: props.existKnowledgeBaseId,
          },
          physicalResourceId: PhysicalResourceId.of(props.existKnowledgeBaseId),
        },
        policy: AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ["bedrock:GetKnowledgeBase"],
            resources: [
              `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.existKnowledgeBaseId}`,
            ],
          }),
        ]),
      });

      const executionRoleArn = getKnowledgeBase.getResponseField("roleArn");

      kb = KnowledgeBase.fromKnowledgeBaseAttributes(this, "MyKnowledgeBase", {
        knowledgeBaseId: props.existKnowledgeBaseId,
        executionRoleArn: executionRoleArn,
      });
    }

    new CfnOutput(this, "KnowledgeBaseId", {
      value: kb.knowledgeBaseId,
    });
    new CfnOutput(this, "KnowledgeBaseArn", {
      value: kb.knowledgeBaseArn,
    });
    new CfnOutput(this, "OwnerUserId", {
      value: props.ownerUserId,
    });
    new CfnOutput(this, "BotId", {
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

  private parseS3Url(url: string): { bucketName: string; prefix: string } {
    console.info(`Parsing S3 URL: ${url}`);
    if (!url.startsWith("s3://")) {
      throw new Error(`Invalid S3 URL format: ${url}`);
    }

    const urlParts = url.replace("s3://", "").split("/");
    if (urlParts.length < 1) {
      throw new Error(`Invalid S3 URL format: ${url}`);
    }

    const bucketName = urlParts.shift()!;
    const prefix = urlParts.join("/");
    console.info(`Parsed S3 URL: bucketName=${bucketName}, prefix=${prefix}`);
    return { bucketName, prefix };
  }
}
