import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  BedrockFoundationModel,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import {
  HierarchicalChunkingProps,
  ChunkingStrategy,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/chunking";
import {
  CrawlingScope,
  CrawlingFilters,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/data-sources/web-crawler-data-source";
import { Analyzer } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/opensearch-vectorindex";
import {
  CharacterFilterType,
  TokenFilterType,
  TokenizerType,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/opensearchserverless";

interface FixedSizeOptions {
  readonly maxTokens: number;
  readonly overlapPercentage: number;
}

interface SemanticOptions {
  readonly maxTokens: number;
  readonly bufferSize: number;
  readonly breakpointPercentileThreshold: number;
}

export const getEmbeddingModel = (
  embeddingsModel: string
): BedrockFoundationModel => {
  switch (embeddingsModel) {
    case "titan_v2":
      return BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024;
    case "cohere_multilingual_v3":
      return BedrockFoundationModel.COHERE_EMBED_MULTILINGUAL_V3;
    default:
      throw new Error(`Unknown embeddings model: ${embeddingsModel}`);
  }
};

export const getParsingModel = (
  parsingModel: string
): BedrockFoundationModel | undefined => {
  switch (parsingModel) {
    case "anthropic.claude-3-5-sonnet-v1":
      return BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0;
    case "anthropic.claude-3-haiku-v1":
      return BedrockFoundationModel.ANTHROPIC_CLAUDE_HAIKU_V1_0;
    case "disabled":
      return undefined
    default:
      throw new Error(`Unknown parsing model: ${parsingModel}`);
  }
}

export const getCrowlingScope = (
  web_crawling_scope: string
): CrawlingScope | undefined => {

  switch(web_crawling_scope) {
    case "DEFAULT":
      return CrawlingScope.DEFAULT
    case "HOST_ONLY":
      return CrawlingScope.HOST_ONLY
    case "SUBDOMAINS":
      return CrawlingScope.SUBDOMAINS
    default:
      return undefined
  }
}

export const getCrawlingFilters =(
  web_crawling_filters: any
): CrawlingFilters => {
  const regularJson = unmarshall(web_crawling_filters);
  console.log(`regularJson: ${JSON.stringify(regularJson)}`)

  let excludePatterns = undefined
  let includePatterns = undefined

  if (regularJson.exclude_patterns.length > 0 && regularJson.exclude_patterns[0] != "") excludePatterns = regularJson.exclude_patterns
  if (regularJson.include_patterns.length > 0 && regularJson.include_patterns[0] != "") includePatterns = regularJson.include_patterns

  return {
    excludePatterns,
    includePatterns,
  }
}

export const getChunkingStrategy = (
  chunkingStrategy: string,
  embeddingsModel: string,
  options?: Partial<FixedSizeOptions & HierarchicalChunkingProps & SemanticOptions>
): ChunkingStrategy => {
  switch (chunkingStrategy) {
    case "default":
      return ChunkingStrategy.DEFAULT;
    case "fixed_size":
      if (options?.maxTokens !== undefined && options?.overlapPercentage !== undefined) {
        return ChunkingStrategy.fixedSize({
          maxTokens: options.maxTokens,
          overlapPercentage: options.overlapPercentage
        });
      }
      return ChunkingStrategy.FIXED_SIZE;
    case "hierarchical":
      if (options?.overlapTokens !== undefined && options?.maxParentTokenSize !== undefined && options?.maxChildTokenSize !== undefined) {
        return ChunkingStrategy.hierarchical({
          overlapTokens: options.overlapTokens,
          maxParentTokenSize: options.maxParentTokenSize,
          maxChildTokenSize: options.maxChildTokenSize
        });
      }
      return embeddingsModel === 'titan_v2' ? ChunkingStrategy.HIERARCHICAL_TITAN : ChunkingStrategy.HIERARCHICAL_COHERE;
    case "semantic":
      // Check that it is not explicitly undefined because bufferSize is set to 0, it will be created with the default value even if other parameters changed.
      if (options?.maxTokens !== undefined && options?.bufferSize !== undefined && options?.breakpointPercentileThreshold !== undefined) {
        return ChunkingStrategy.semantic({
          maxTokens: options.maxTokens,
          bufferSize: options.bufferSize,
          breakpointPercentileThreshold: options.breakpointPercentileThreshold
        });
      }
      return ChunkingStrategy.SEMANTIC;
    case "none":
      return ChunkingStrategy.NONE;
    default:
      throw new Error(`Unknown chunking strategy: ${chunkingStrategy}`);
  }
};

export const getAnalyzer = (analyzer: any): Analyzer | undefined => {
  // Example of analyzer:
  //    {
  //     "character_filters": {
  //       "L": [
  //         {
  //           "S": "icu_normalizer"
  //         }
  //       ]
  //     },
  //     "token_filters": {
  //       "L": [
  //         {
  //           "S": "kuromoji_baseform"
  //         },
  //         {
  //           "S": "kuromoji_part_of_speech"
  //         }
  //       ]
  //     },
  //     "tokenizer": {
  //       "S": "kuromoji_tokenizer"
  //     }
  //   }
  console.log("getAnalyzer: analyzer: ", analyzer);
  if (
    !analyzer ||
    !analyzer.character_filters ||
    !analyzer.character_filters.L
  ) {
    return undefined;
  }

  const characterFilters: CharacterFilterType[] =
    analyzer.character_filters.L.map((filter: any) => {
      switch (filter.S) {
        case "icu_normalizer":
          return CharacterFilterType.ICU_NORMALIZER;
        default:
          throw new Error(`Unknown character filter: ${filter.S}`);
      }
    });

  const tokenizer: TokenizerType = (() => {
    if (!analyzer.tokenizer || !analyzer.tokenizer.S) {
      throw new Error(`Tokenizer is not defined`);
    }
    switch (analyzer.tokenizer.S) {
      case "kuromoji_tokenizer":
        return TokenizerType.KUROMOJI_TOKENIZER;
      case "icu_tokenizer":
        return TokenizerType.ICU_TOKENIZER;
      default:
        throw new Error(`Unknown tokenizer: ${analyzer.tokenizer.S}`);
    }
  })();

  const tokenFilters: TokenFilterType[] =
    analyzer.token_filters?.L.map((filter: any) => {
      switch (filter.S) {
        case "kuromoji_baseform":
          return TokenFilterType.KUROMOJI_BASEFORM;
        case "kuromoji_part_of_speech":
          return TokenFilterType.KUROMOJI_PART_OF_SPEECH;
        case "kuromoji_stemmer":
          return TokenFilterType.KUROMOJI_STEMMER;
        case "cjk_width":
          return TokenFilterType.CJK_WIDTH;
        case "ja_stop":
          return TokenFilterType.JA_STOP;
        case "lowercase":
          return TokenFilterType.LOWERCASE;
        case "icu_folding":
          return TokenFilterType.ICU_FOLDING;
        default:
          throw new Error(`Unknown token filter: ${filter.S}`);
      }
    }) || [];

  return {
    characterFilters,
    tokenizer,
    tokenFilters,
  };
};
