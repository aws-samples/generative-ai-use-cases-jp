import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BedrockCustomBotStack } from "../lib/bedrock-custom-bot-stack";
import {
  getEmbeddingModel,
  getChunkingStrategy,
  getAnalyzer,
  getParsingModel,
  getCrowlingScope,
  getCrawlingFilters,
} from "../lib/utils/bedrock-knowledge-base-args";
import { BedrockFoundationModel } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { ChunkingStrategy } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/chunking";
import {
  CrawlingFilters,
  CrawlingScope,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/web-crawler-data-source";
import { Analyzer } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/opensearch-vectorindex";
import { resolveBedrockCustomBotParameters } from "../lib/utils/parameter-models";

const app = new cdk.App();

// Get parameters specific to Bedrock Custom Bot
const params = resolveBedrockCustomBotParameters();

// Parse JSON strings into objects
const knowledgeBaseJson = JSON.parse(params.knowledgeBase);
const knowledgeJson = JSON.parse(params.knowledge);
const guardrailsJson = JSON.parse(params.guardrails);

// Define interfaces for typed configuration objects
interface BaseConfig {
  envName: string;
  envPrefix: string;
  bedrockRegion: string;
  ownerUserId: string;
  botId: string;
  documentBucketName: string;
  enableRagReplicas: boolean;
}

interface KnowledgeConfig {
  embeddingsModel: BedrockFoundationModel;
  parsingModel: BedrockFoundationModel | undefined;
  existKnowledgeBaseId?: string;
  existingS3Urls: string[];
  sourceUrls: string[];
  instruction?: string;
  analyzer?: Analyzer | undefined;
}

interface ChunkingConfig {
  chunkingStrategy: ChunkingStrategy;
  maxTokens?: number;
  overlapPercentage?: number;
  overlapTokens?: number;
  maxParentTokenSize?: number;
  maxChildTokenSize?: number;
  bufferSize?: number;
  breakpointPercentileThreshold?: number;
}

interface GuardrailConfig {
  is_guardrail_enabled?: boolean;
  hateThreshold?: number;
  insultsThreshold?: number;
  sexualThreshold?: number;
  violenceThreshold?: number;
  misconductThreshold?: number;
  groundingThreshold?: number;
  relevanceThreshold?: number;
  guardrailArn?: number;
  guardrailVersion?: number;
}

interface CrawlingConfig {
  crawlingScope?: CrawlingScope | undefined;
  crawlingFilters: CrawlingFilters;
}

// Extract and organize configuration by category
const baseConfig: BaseConfig = {
  envName: params.envName,
  envPrefix: params.envPrefix,
  bedrockRegion: params.bedrockRegion,
  ownerUserId: params.pk,
  botId: params.sk.split("#")[1],
  documentBucketName: params.documentBucketName,
  enableRagReplicas: params.enableRagReplicas === true,
};

const knowledgeConfig: KnowledgeConfig = {
  embeddingsModel: getEmbeddingModel(knowledgeBaseJson.embeddings_model.S),
  parsingModel: getParsingModel(knowledgeBaseJson.parsing_model.S),
  existKnowledgeBaseId: knowledgeBaseJson.exist_knowledge_base_id?.S,
  existingS3Urls: knowledgeJson.s3_urls.L.map((s3Url: any) => s3Url.S),
  sourceUrls: knowledgeJson.source_urls.L.map((sourceUrl: any) => sourceUrl.S),
  instruction: knowledgeBaseJson.instruction?.S,
  analyzer: knowledgeBaseJson.open_search.M.analyzer.M
    ? getAnalyzer(knowledgeBaseJson.open_search.M.analyzer.M)
    : undefined,
};

// Extract chunking configuration
const chunkingParams = {
  maxTokens: knowledgeBaseJson.chunking_configuration.M.max_tokens
    ? Number(knowledgeBaseJson.chunking_configuration.M.max_tokens.N)
    : undefined,
  overlapPercentage: knowledgeBaseJson.chunking_configuration.M
    .overlap_percentage
    ? Number(knowledgeBaseJson.chunking_configuration.M.overlap_percentage.N)
    : undefined,
  overlapTokens: knowledgeBaseJson.chunking_configuration.M.overlap_tokens
    ? Number(knowledgeBaseJson.chunking_configuration.M.overlap_tokens.N)
    : undefined,
  maxParentTokenSize: knowledgeBaseJson.chunking_configuration.M
    .max_parent_token_size
    ? Number(knowledgeBaseJson.chunking_configuration.M.max_parent_token_size.N)
    : undefined,
  maxChildTokenSize: knowledgeBaseJson.chunking_configuration.M
    .max_child_token_size
    ? Number(knowledgeBaseJson.chunking_configuration.M.max_child_token_size.N)
    : undefined,
  bufferSize: knowledgeBaseJson.chunking_configuration.M.buffer_size
    ? Number(knowledgeBaseJson.chunking_configuration.M.buffer_size.N)
    : undefined,
  breakpointPercentileThreshold: knowledgeBaseJson.chunking_configuration.M
    .breakpoint_percentile_threshold
    ? Number(
        knowledgeBaseJson.chunking_configuration.M
          .breakpoint_percentile_threshold.N
      )
    : undefined,
};

const chunkingConfig: ChunkingConfig = {
  ...chunkingParams,
  chunkingStrategy: getChunkingStrategy(
    knowledgeBaseJson.chunking_configuration.M.chunking_strategy.S,
    knowledgeBaseJson.embeddings_model.S,
    chunkingParams
  ),
};

const crawlingConfig: CrawlingConfig = {
  crawlingScope: getCrowlingScope(knowledgeBaseJson.web_crawling_scope.S),
  crawlingFilters: getCrawlingFilters(knowledgeBaseJson.web_crawling_filters.M),
};

const guardrailConfig: GuardrailConfig = {
  is_guardrail_enabled: guardrailsJson.is_guardrail_enabled
    ? Boolean(guardrailsJson.is_guardrail_enabled.BOOL)
    : undefined,
  hateThreshold: guardrailsJson.hate_threshold
    ? Number(guardrailsJson.hate_threshold.N)
    : undefined,
  insultsThreshold: guardrailsJson.insults_threshold
    ? Number(guardrailsJson.insults_threshold.N)
    : undefined,
  sexualThreshold: guardrailsJson.sexual_threshold
    ? Number(guardrailsJson.sexual_threshold.N)
    : undefined,
  violenceThreshold: guardrailsJson.violence_threshold
    ? Number(guardrailsJson.violence_threshold.N)
    : undefined,
  misconductThreshold: guardrailsJson.misconduct_threshold
    ? Number(guardrailsJson.misconduct_threshold.N)
    : undefined,
  groundingThreshold: guardrailsJson.grounding_threshold
    ? Number(guardrailsJson.grounding_threshold.N)
    : undefined,
  relevanceThreshold: guardrailsJson.relevance_threshold
    ? Number(guardrailsJson.relevance_threshold.N)
    : undefined,
  guardrailArn: guardrailsJson.guardrail_arn
    ? Number(guardrailsJson.guardrail_arn.N)
    : undefined,
  guardrailVersion: guardrailsJson.guardrail_version
    ? Number(guardrailsJson.guardrail_version.N)
    : undefined,
};

// Log organized configurations for debugging
console.log("Base Configuration:", JSON.stringify(baseConfig, null, 2));
console.log(
  "Knowledge Configuration:",
  JSON.stringify(
    {
      ...knowledgeConfig,
      embeddingsModel: knowledgeConfig.embeddingsModel.toString(),
      parsingModel: knowledgeConfig.parsingModel?.toString(),
      analyzer: knowledgeConfig.analyzer ? "configured" : "undefined",
    },
    null,
    2
  )
);
console.log(
  "Chunking Configuration:",
  JSON.stringify(
    {
      ...chunkingConfig,
      chunkingStrategy: chunkingConfig.chunkingStrategy.toString(),
    },
    null,
    2
  )
);
console.log(
  "Guardrail Configuration:",
  JSON.stringify(guardrailConfig, null, 2)
);
console.log(
  "Crawling Configuration:",
  JSON.stringify(
    {
      crawlingScope: crawlingConfig.crawlingScope?.toString(),
      crawlingFilters: crawlingConfig.crawlingFilters,
    },
    null,
    2
  )
);

// Create the stack
new BedrockCustomBotStack(app, `BrChatKbStack${baseConfig.botId}`, {
  // Environment configuration
  env: {
    region: baseConfig.bedrockRegion,
  },

  // Base configuration
  ownerUserId: baseConfig.ownerUserId,
  botId: baseConfig.botId,
  bedrockClaudeChatDocumentBucketName: baseConfig.documentBucketName,
  enableRagReplicas: baseConfig.enableRagReplicas,

  // Knowledge base configuration
  embeddingsModel: knowledgeConfig.embeddingsModel,
  parsingModel: knowledgeConfig.parsingModel,
  existKnowledgeBaseId: knowledgeConfig.existKnowledgeBaseId,
  existingS3Urls: knowledgeConfig.existingS3Urls,
  sourceUrls: knowledgeConfig.sourceUrls,
  instruction: knowledgeConfig.instruction,
  analyzer: knowledgeConfig.analyzer,

  // Chunking configuration
  chunkingStrategy: chunkingConfig.chunkingStrategy,
  maxTokens: chunkingConfig.maxTokens,
  overlapPercentage: chunkingConfig.overlapPercentage,

  // Crawling configuration
  crawlingScope: crawlingConfig.crawlingScope,
  crawlingFilters: crawlingConfig.crawlingFilters,

  // Guardrail configuration
  guardrail: guardrailConfig,
});

cdk.Tags.of(app).add("CDKEnvironment", baseConfig.envName);
