from typing import Literal

from app.routes.schemas.base import BaseSchema
from pydantic import Field

# Ref: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_ChunkingConfiguration.html
type_kb_chunking_strategy = Literal[
    "default",
    "fixed_size",
    "hierarchical",
    "semantic",
    "none",
]
type_kb_embeddings_model = Literal["titan_v2", "cohere_multilingual_v3"]
type_kb_search_type = Literal["hybrid", "semantic"]
type_kb_parsing_model = Literal[
    "anthropic.claude-3-5-sonnet-v1",
    "anthropic.claude-3-haiku-v1",
    "anthropic.claude-3-sonnet-v1",
    "disabled",
]
type_kb_web_crawling_scope = Literal["DEFAULT", "HOST_ONLY", "SUBDOMAINS"]

# OpenSearch Serverless Analyzer
# Ref: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-genref.html
type_os_character_filter = Literal["icu_normalizer"]
type_os_tokenizer = Literal["kuromoji_tokenizer", "icu_tokenizer"]
type_os_token_filter = Literal[
    "kuromoji_baseform",
    "kuromoji_part_of_speech",
    "kuromoji_stemmer",
    "cjk_width",
    "ja_stop",
    "lowercase",
    "icu_folding",
]

# Knowledge Base Type
# Ref: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_KnowledgeBaseConfiguration.html#bedrock-Type-agent_KnowledgeBaseConfiguration-type
type_kb_resource_type = Literal["VECTOR", "KENDRA", "SQL"]


class SearchParams(BaseSchema):
    max_results: int
    search_type: type_kb_search_type


class AnalyzerParams(BaseSchema):
    character_filters: list[type_os_character_filter]
    tokenizer: type_os_tokenizer
    token_filters: list[type_os_token_filter]


class OpenSearchParams(BaseSchema):
    analyzer: AnalyzerParams | None


class DefaultParams(BaseSchema):
    chunking_strategy: type_kb_chunking_strategy = "default"


class FixedSizeParams(BaseSchema):
    chunking_strategy: type_kb_chunking_strategy = "fixed_size"
    max_tokens: int | None = None
    overlap_percentage: int | None = None


class HierarchicalParams(BaseSchema):
    chunking_strategy: type_kb_chunking_strategy = "hierarchical"
    overlap_tokens: int | None = None
    max_parent_token_size: int | None = None
    max_child_token_size: int | None = None


class SemanticParams(BaseSchema):
    chunking_strategy: type_kb_chunking_strategy = "semantic"
    max_tokens: int | None = None
    buffer_size: int | None = None
    breakpoint_percentile_threshold: int | None = None


class NoneParams(BaseSchema):
    chunking_strategy: type_kb_chunking_strategy = "none"


class WebCrawlingFilters(BaseSchema):
    exclude_patterns: list[str] = Field(default_factory=list)
    include_patterns: list[str] = Field(default_factory=list)


class BedrockKnowledgeBaseInput(BaseSchema):
    embeddings_model: type_kb_embeddings_model
    open_search: OpenSearchParams
    chunking_configuration: (
        DefaultParams
        | FixedSizeParams
        | HierarchicalParams
        | SemanticParams
        | NoneParams
    )
    search_params: SearchParams
    knowledge_base_id: str | None = None
    exist_knowledge_base_id: str | None = None
    parsing_model: type_kb_parsing_model = "disabled"
    web_crawling_scope: type_kb_web_crawling_scope = "DEFAULT"
    web_crawling_filters: WebCrawlingFilters = WebCrawlingFilters(
        exclude_patterns=[], include_patterns=[]
    )


class BedrockKnowledgeBaseOutput(BaseSchema):
    embeddings_model: type_kb_embeddings_model
    open_search: OpenSearchParams
    chunking_configuration: (
        DefaultParams
        | FixedSizeParams
        | HierarchicalParams
        | SemanticParams
        | NoneParams
        | None
    )
    search_params: SearchParams
    knowledge_base_id: str | None = None
    exist_knowledge_base_id: str | None = None
    data_source_ids: list[str] | None = None
    parsing_model: type_kb_parsing_model = "disabled"
    web_crawling_scope: type_kb_web_crawling_scope = "DEFAULT"
    web_crawling_filters: WebCrawlingFilters = WebCrawlingFilters(
        exclude_patterns=[], include_patterns=[]
    )
