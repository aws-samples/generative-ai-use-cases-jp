from __future__ import annotations

from typing import (
    TYPE_CHECKING,
    Annotated,
    Any,
    Dict,
    List,
    Literal,
    Optional,
    Type,
    get_args,
)

from app.routes.schemas.base import BaseSchema
from app.routes.schemas.bot_guardrails import (
    BedrockGuardrailsInput,
    BedrockGuardrailsOutput,
)
from app.routes.schemas.bot_kb import (
    BedrockKnowledgeBaseInput,
    BedrockKnowledgeBaseOutput,
)
from app.routes.schemas.conversation import type_model_name
from charset_normalizer.utils import is_punctuation
from pydantic import (
    Discriminator,
    Field,
    create_model,
    field_validator,
    model_validator,
    validator,
)

if TYPE_CHECKING:
    from app.repositories.models.custom_bot import BotModel

# Knowledge sync status type
# NOTE: `ORIGINAL_NOT_FOUND` is used when the original bot is removed.
type_sync_status = Literal[
    "QUEUED",
    "KNOWLEDGE_BASE_STACK_CREATED",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "ORIGINAL_NOT_FOUND",
]

type_shared_scope = Literal["partial", "all", "private"]


def _create_model_activate_input(model_names: List[str]) -> Type[BaseSchema]:
    fields: Dict[str, Any] = {
        name.replace("-", "_").replace(".", "_"): (bool, True) for name in model_names
    }
    return create_model("ActiveModelsInput", **fields, __base__=BaseSchema)


ActiveModelsInput = _create_model_activate_input(list(get_args(type_model_name)))


def create_model_activate_output(model_names: List[str]) -> Type[BaseSchema]:
    fields: Dict[str, Any] = {
        name.replace("-", "_").replace(".", "_"): (bool, True) for name in model_names
    }
    return create_model("ActiveModelsOutput", **fields, __base__=BaseSchema)


ActiveModelsOutput = create_model_activate_output(list(get_args(type_model_name)))


class ReasoningParams(BaseSchema):
    budget_tokens: int


class GenerationParams(BaseSchema):
    max_tokens: int
    top_k: int
    top_p: float
    temperature: float
    stop_sequences: list[str]
    reasoning_params: ReasoningParams


class FirecrawlConfig(BaseSchema):
    api_key: str
    max_results: int = Field(default=10, ge=1, le=100)

    @field_validator("api_key")
    def validate_api_key(cls, v):
        if v == "":
            raise ValueError("Firecrawl API key is empty")
        return v


class BedrockAgentConfig(BaseSchema):
    agent_id: str
    alias_id: str


class PlainTool(BaseSchema):
    tool_type: Literal["plain"] = "plain"
    name: str
    description: str


class InternetTool(BaseSchema):
    tool_type: Literal["internet"]
    name: str
    description: str
    search_engine: Optional[Literal["duckduckgo", "firecrawl"]]
    firecrawl_config: Optional[FirecrawlConfig] | None = None

    @field_validator("search_engine")
    def validate_search_engine(cls, v):
        if v not in ["duckduckgo", "firecrawl"]:
            raise ValueError(f"Invalid search engine: {v}")
        return v

    @validator("firecrawl_config")
    def validate_firecrawl_config(cls, v, values):
        if values.get("search_engine") == "firecrawl" and v is None:
            raise ValueError(
                "Firecrawl config is required when search engine is firecrawl"
            )
        return v


class BedrockAgentTool(BaseSchema):
    tool_type: Literal["bedrock_agent"]
    name: str
    description: str
    bedrockAgentConfig: Optional[BedrockAgentConfig] | None = None


Tool = Annotated[
    PlainTool | InternetTool | BedrockAgentTool, Discriminator("tool_type")
]


class Agent(BaseSchema):
    tools: list[Tool]

    @field_validator("tools", mode="before")
    def handle_legacy_tools(cls, v):
        """For backward compatibility, convert legacy tools to the new format.
        If the tool is legacy such that it does not have a `tool_type` field,
        it will be converted to a `plain` tool.
        """
        if isinstance(v, list):
            converted_tools = []
            for tool in v:
                if isinstance(tool, dict) and "tool_type" not in tool:
                    tool["tool_type"] = "plain"
                converted_tools.append(tool)
            return converted_tools
        return v


class AgentInput(BaseSchema):
    tools: list[Tool] = Field(..., description="List of tools")


class Knowledge(BaseSchema):
    source_urls: list[str]
    sitemap_urls: list[str]
    filenames: list[str]
    s3_urls: list[str]

    @validator("s3_urls", each_item=True)
    def validate_s3_url(cls, v):
        if not v.startswith("s3://"):
            raise ValueError(f"Invalid S3 URL format: {v}")

        url_parts = v.replace("s3://", "").split("/")
        if len(url_parts) < 1:
            raise ValueError(f"Invalid S3 URL format: {v}")

        bucket_name = url_parts.pop(0)
        prefix = "/".join(url_parts)

        if not bucket_name:
            raise ValueError(f"Invalid S3 URL format: {v}")

        if not v.endswith("/"):
            raise ValueError(f"Invalid S3 URL format (must end with a '/'): {v}")

        return v


class KnowledgeDiffInput(BaseSchema):
    source_urls: list[str]
    sitemap_urls: list[str]
    s3_urls: list[str]
    added_filenames: list[str]
    deleted_filenames: list[str]
    unchanged_filenames: list[str]


class ConversationQuickStarter(BaseSchema):
    title: str
    example: str


class BotInput(BaseSchema):
    id: str
    title: str
    instruction: str
    description: str | None
    generation_params: GenerationParams | None
    agent: Optional[AgentInput] = None
    knowledge: Knowledge | None
    display_retrieved_chunks: bool
    prompt_caching_enabled: bool = True
    conversation_quick_starters: list[ConversationQuickStarter] | None
    bedrock_knowledge_base: BedrockKnowledgeBaseInput | None = None
    bedrock_guardrails: BedrockGuardrailsInput | None = None
    active_models: ActiveModelsInput  # type: ignore

    def has_knowledge(self) -> bool:
        if self.knowledge:
            return (
                len(self.knowledge.source_urls) > 0
                or len(self.knowledge.sitemap_urls) > 0
                or len(self.knowledge.filenames) > 0
                or len(self.knowledge.s3_urls) > 0
                # This is a condition for running Sfn to register existing KB information in DynamoDB when an existing KB is specified.
                or (
                    self.bedrock_knowledge_base is not None
                    and self.bedrock_knowledge_base.exist_knowledge_base_id is not None
                )
            )
        return False

    def has_guardrails(self) -> bool:
        if self.bedrock_guardrails is None:
            return False

        return self.bedrock_guardrails.is_guardrail_enabled == True


class BotModifyInput(BaseSchema):
    title: str
    instruction: str
    description: str | None
    generation_params: GenerationParams | None
    agent: Optional[AgentInput] = None
    knowledge: KnowledgeDiffInput | None
    display_retrieved_chunks: bool
    prompt_caching_enabled: bool
    conversation_quick_starters: list[ConversationQuickStarter] | None
    bedrock_knowledge_base: BedrockKnowledgeBaseInput | None = None
    bedrock_guardrails: BedrockGuardrailsInput | None = None
    active_models: ActiveModelsInput  # type: ignore

    def _has_update_files(self) -> bool:
        return self.knowledge is not None and (
            len(self.knowledge.added_filenames) > 0
            or len(self.knowledge.deleted_filenames) > 0
        )

    def _has_update_source_urls(self, current_bot_model: BotModel) -> bool:
        return self.knowledge is not None and (
            len(self.knowledge.source_urls) > 0
            and (
                set(self.knowledge.source_urls)
                != set(current_bot_model.knowledge.source_urls)
            )
        )

    def _is_crawling_scope_modified(self, current_bot_model: BotModel) -> bool:
        if (
            self.bedrock_knowledge_base is None
            or current_bot_model.bedrock_knowledge_base is None
        ):
            return False
        return (
            self.bedrock_knowledge_base.web_crawling_scope
            != current_bot_model.bedrock_knowledge_base.web_crawling_scope
        )

    def _is_crawling_filters_modified(self, current_bot_model: BotModel) -> bool:
        if (
            self.bedrock_knowledge_base is None
            or current_bot_model.bedrock_knowledge_base is None
            or self.bedrock_knowledge_base.web_crawling_filters is None
            or current_bot_model.bedrock_knowledge_base.web_crawling_filters is None
        ):
            return False
        return set(
            self.bedrock_knowledge_base.web_crawling_filters.exclude_patterns
        ) != set(
            current_bot_model.bedrock_knowledge_base.web_crawling_filters.exclude_patterns
        ) or set(
            self.bedrock_knowledge_base.web_crawling_filters.include_patterns
        ) != set(
            current_bot_model.bedrock_knowledge_base.web_crawling_filters.include_patterns
        )

    def is_guardrails_update_required(self, current_bot_model: BotModel) -> bool:
        # Check if self.bedrock_guardrails is None
        if not self.bedrock_guardrails:
            return False

        # Check if guardrails are enabled or any of the settings have changed
        if self.bedrock_guardrails.is_guardrail_enabled == True or (
            current_bot_model.bedrock_guardrails
            and (
                self.bedrock_guardrails.is_guardrail_enabled
                != current_bot_model.bedrock_guardrails.is_guardrail_enabled
                or self.bedrock_guardrails.hate_threshold
                != current_bot_model.bedrock_guardrails.hate_threshold
                or self.bedrock_guardrails.insults_threshold
                != current_bot_model.bedrock_guardrails.insults_threshold
                or self.bedrock_guardrails.sexual_threshold
                != current_bot_model.bedrock_guardrails.sexual_threshold
                or self.bedrock_guardrails.grounding_threshold
                != current_bot_model.bedrock_guardrails.grounding_threshold
                or self.bedrock_guardrails.relevance_threshold
                != current_bot_model.bedrock_guardrails.relevance_threshold
            )
        ):
            return True

        # If none of the conditions above are met, guardrails are not required
        return False

    def is_embedding_required(self, current_bot_model: BotModel) -> bool:
        if self._has_update_files():
            return True

        if self._has_update_source_urls(current_bot_model):
            return True

        if self._is_crawling_scope_modified(current_bot_model):
            return True

        if self._is_crawling_filters_modified(current_bot_model):
            return True

        if self.knowledge is not None and current_bot_model.has_knowledge():
            if (
                set(self.knowledge.source_urls)
                == set(current_bot_model.knowledge.source_urls)
                and set(self.knowledge.sitemap_urls)
                == set(current_bot_model.knowledge.sitemap_urls)
                and set(self.knowledge.s3_urls)
                == set(current_bot_model.knowledge.s3_urls)
            ):
                pass
            else:
                return True

        return False


class BotModifyOutput(BaseSchema):
    id: str
    title: str
    instruction: str
    description: str
    generation_params: GenerationParams
    agent: Agent
    knowledge: Knowledge
    prompt_caching_enabled: bool
    conversation_quick_starters: list[ConversationQuickStarter]
    bedrock_knowledge_base: BedrockKnowledgeBaseOutput | None
    bedrock_guardrails: BedrockGuardrailsOutput | None
    active_models: ActiveModelsOutput  # type: ignore


class BotOutput(BaseSchema):
    id: str
    title: str
    description: str
    instruction: str
    create_time: float
    last_used_time: float
    shared_scope: type_shared_scope
    shared_status: str
    allowed_cognito_groups: list[str]
    allowed_cognito_users: list[str]
    owner_user_id: str
    is_publication: bool
    generation_params: GenerationParams
    agent: Agent
    knowledge: Knowledge
    prompt_caching_enabled: bool
    sync_status: type_sync_status
    sync_status_reason: str
    sync_last_exec_id: str
    display_retrieved_chunks: bool
    conversation_quick_starters: list[ConversationQuickStarter]
    bedrock_knowledge_base: BedrockKnowledgeBaseOutput | None
    bedrock_guardrails: BedrockGuardrailsOutput | None
    active_models: ActiveModelsOutput  # type: ignore


class BotMetaOutput(BaseSchema):
    id: str
    title: str
    description: str
    create_time: float
    last_used_time: float
    is_starred: bool
    owned: bool
    # Whether the bot is available or not.
    # This can be `False` if the bot is not owned by the user and original bot is removed.
    available: bool
    sync_status: type_sync_status
    shared_scope: type_shared_scope
    shared_status: str = Field(
        ...,
        description="Shared status of the bot. Possible values: `private`, `shared` and `pinned@xxx",
    )


class BotSummaryOutput(BaseSchema):
    id: str
    title: str
    description: str
    create_time: float
    last_used_time: float
    is_starred: bool
    has_agent: bool
    owned: bool
    sync_status: type_sync_status
    has_knowledge: bool
    conversation_quick_starters: list[ConversationQuickStarter]
    shared_scope: type_shared_scope
    shared_status: str = Field(
        ...,
        description="Shared status of the bot. Possible values: `private`, `shared` and `pinned@xxx",
    )
    active_models: ActiveModelsOutput  # type: ignore


class PrivateVisibilityInput(BaseSchema):
    target_shared_scope: Literal["private"]


class PartialVisibilityInput(BaseSchema):
    target_shared_scope: Literal["partial"]
    target_allowed_user_ids: list[str]
    target_allowed_group_ids: list[str]

    # @model_validator(mode="after")
    # def validate_not_both_empty(self) -> Self:
    #     if not self.target_allowed_user_ids and not self.target_allowed_group_ids:
    #         raise ValueError(
    #             "Either target_allowed_user_ids or target_allowed_group_ids must not be empty"
    #         )
    #     return self


class AllVisibilityInput(BaseSchema):
    target_shared_scope: Literal["all"]


BotSwitchVisibilityInput = (
    PrivateVisibilityInput | PartialVisibilityInput | AllVisibilityInput
)


class BotStarredInput(BaseSchema):
    starred: bool


class BotPresignedUrlOutput(BaseSchema):
    url: str
