import logging
from typing import Annotated, Any, Dict, List, Literal, Optional, Self, Type, get_args

from app.config import DEFAULT_GENERATION_CONFIG
from app.config import GenerationParams as GenerationParamsDict
from app.repositories.models.common import DynamicBaseModel, Float, SecureString
from app.repositories.models.custom_bot_guardrails import BedrockGuardrailsModel
from app.repositories.models.custom_bot_kb import BedrockKnowledgeBaseModel
from app.routes.schemas.bot import (
    ActiveModelsOutput,
    Agent,
    AgentInput,
    BedrockAgentConfig,
    BedrockAgentTool,
    BedrockGuardrailsOutput,
    BedrockKnowledgeBaseOutput,
    BotInput,
    BotMetaOutput,
    BotOutput,
    BotSummaryOutput,
    ConversationQuickStarter,
    FirecrawlConfig,
    GenerationParams,
    InternetTool,
    Knowledge,
    PlainTool,
    ReasoningParams,
    Tool,
    type_shared_scope,
    type_sync_status,
)
from app.routes.schemas.conversation import type_model_name
from app.user import User
from app.utils import (
    get_api_key_from_secret_manager,
    get_current_time,
    get_user_cognito_groups,
    store_api_key_to_secret_manager,
)
from pydantic import (
    BaseModel,
    ConfigDict,
    Discriminator,
    Field,
    ValidationInfo,
    create_model,
    field_validator,
    model_validator,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _create_model_activate_model(model_names: List[str]) -> Type[DynamicBaseModel]:
    fields: Dict[str, Any] = {
        name.replace("-", "_").replace(".", "_"): (bool, True) for name in model_names
    }
    return create_model("ActiveModelsModel", __base__=DynamicBaseModel, **fields)


ActiveModelsModel: Type[BaseModel] = _create_model_activate_model(
    list(get_args(type_model_name))
)


default_active_models = ActiveModelsModel.model_validate(
    {field_name: True for field_name in ActiveModelsModel.model_fields.keys()}
)


class KnowledgeModel(BaseModel):
    source_urls: list[str]
    sitemap_urls: list[str]
    filenames: list[str]
    s3_urls: list[str]

    def __str_in_claude_format__(self) -> str:
        """Description of the knowledge in Claude format."""
        _source_urls = "<source_urls>"
        for url in self.source_urls:
            _source_urls += f"<url>{url}</url>"
        _source_urls += "</source_urls>"
        _sitemap_urls = "<sitemap_urls>"
        for url in self.sitemap_urls:
            _sitemap_urls += f"<url>{url}</url>"
        _sitemap_urls += "</sitemap_urls>"
        _filenames = "<filenames>"
        for filename in self.filenames:
            _filenames += f"<filename>{filename}</filename>"
        _filenames += "</filenames>"
        _s3_urls = "<s3_urls>"
        for url in self.s3_urls:
            _s3_urls += f"<url>{url}</url>"
        _s3_urls += "</s3_urls>"
        return f"{_source_urls}{_sitemap_urls}{_filenames}{_s3_urls}"


class ReasoningParamsModel(BaseModel):
    budget_tokens: int

    @field_validator("budget_tokens")
    def validate_budget_tokens(cls, v: int) -> int:
        if v < 1024:
            raise ValueError("budget_tokens must be greater than or equal to 1024")
        return v


class GenerationParamsModel(BaseModel):
    max_tokens: int = DEFAULT_GENERATION_CONFIG["max_tokens"]
    top_k: int = DEFAULT_GENERATION_CONFIG.get("top_k", 0)
    top_p: Float = DEFAULT_GENERATION_CONFIG["top_p"]
    temperature: Float = DEFAULT_GENERATION_CONFIG["temperature"]
    stop_sequences: list[str] = DEFAULT_GENERATION_CONFIG["stop_sequences"]
    reasoning_params: ReasoningParamsModel = Field(
        default_factory=lambda: ReasoningParamsModel(
            budget_tokens=DEFAULT_GENERATION_CONFIG.get("reasoning_params", {}).get(
                "budget_tokens", 1024
            )
        )
    )


class FirecrawlConfigModel(BaseModel):
    secret_arn: str
    api_key: SecureString
    max_results: int = 10

    @classmethod
    def from_firecrawl_config(
        cls, config: FirecrawlConfig, user_id: str, bot_id: str
    ) -> Self:
        """Create a configuration model from the input and save the API key to Secrets Manager"""
        secret_arn = store_api_key_to_secret_manager(
            user_id, bot_id, "firecrawl", config.api_key
        )

        return cls(
            secret_arn=secret_arn,
            api_key=config.api_key,
            max_results=config.max_results,
        )

    @model_validator(mode="before")
    @classmethod
    def load_secret_from_arn(cls, data):
        """Load the API key from Secrets Manager when the API key is empty"""
        if (
            isinstance(data, dict)
            and "api_key" in data
            and data["api_key"] == ""  # API key is empty
            and "secret_arn" in data
        ):
            try:
                api_key = get_api_key_from_secret_manager(data["secret_arn"])
                data["api_key"] = api_key
            except Exception as e:
                logger.error(f"Failed to retrieve secret from ARN: {e}")
                raise ValueError(
                    f"Failed to retrieve secret from ARN: {data['secret_arn']}"
                )

        return data


class PlainToolModel(BaseModel):
    tool_type: Literal["plain"] = Field(
        "plain",
        description="Type of tool. It does not need additional settings for the plain.",
    )
    name: str
    description: str

    @classmethod
    def from_tool_input(cls, tool: PlainTool) -> Self:
        return cls(tool_type="plain", name=tool.name, description=tool.description)


class InternetToolModel(BaseModel):
    tool_type: Literal["internet"] = Field(
        "internet",
        description="Type of tool. It does need additional settings for the internet search.",
    )
    name: str
    description: str
    search_engine: Optional[Literal["duckduckgo", "firecrawl"]]
    firecrawl_config: Optional[FirecrawlConfigModel] | None = None

    @model_validator(mode="before")
    @classmethod
    def load_firecrawl_secret(cls, data):
        """Ensures validation of nested `FirecrawlConfigModel` with secret loading.

        This validator is specifically for InternetToolModel and handles the nested `FirecrawlConfigModel` validation.
        Without this explicit validation, the `load_secret_from_arn` validator in `FirecrawlConfigModel`
        would not be triggered during the normal nested model validation process and
        `model_validate` would not load the API key from Secrets Manager.
        """
        if (
            isinstance(data, dict)
            and data.get("firecrawl_config")
            and isinstance(data["firecrawl_config"], dict)
        ):
            data["firecrawl_config"] = FirecrawlConfigModel.model_validate(
                data["firecrawl_config"]
            )
        return data

    @classmethod
    def from_tool_input(cls, tool: InternetTool, user_id: str, bot_id: str) -> Self:
        firecrawl_config = None
        if tool.search_engine == "firecrawl" and tool.firecrawl_config:
            firecrawl_config = FirecrawlConfigModel.from_firecrawl_config(
                tool.firecrawl_config, user_id, bot_id
            )

        return cls(
            tool_type="internet",
            name=tool.name,
            description=tool.description,
            search_engine=tool.search_engine,
            firecrawl_config=firecrawl_config,
        )


class BedrockAgentConfigModel(BaseModel):
    agent_id: str
    alias_id: str


class BedrockAgentToolModel(BaseModel):
    tool_type: Literal["bedrock_agent"] = Field(
        "bedrock_agent",
        description="Type of tool. It does need additional settings for the bedrock agent.",
    )
    name: str
    description: str
    bedrockAgentConfig: Optional[BedrockAgentConfigModel] | None = None

    @classmethod
    def from_tool_input(cls, tool: BedrockAgentTool) -> Self:
        return cls(
            tool_type="bedrock_agent",
            name=tool.name,
            description=tool.description,
            bedrockAgentConfig=(
                BedrockAgentConfigModel(
                    agent_id=tool.bedrockAgentConfig.agent_id,
                    alias_id=tool.bedrockAgentConfig.alias_id,
                )
                if tool.bedrockAgentConfig
                else None
            ),
        )


ToolModel = Annotated[
    PlainToolModel | InternetToolModel | BedrockAgentToolModel,
    Discriminator("tool_type"),
]


class AgentModel(BaseModel):
    tools: list[ToolModel]

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

    @classmethod
    def from_agent_input(
        cls, agent_input: Optional[AgentInput], user_id: str, bot_id: str
    ) -> Self:
        if not agent_input or not hasattr(agent_input, "tools"):
            return cls(tools=[])

        tools: List[ToolModel] = []
        for tool_input in agent_input.tools:
            if tool_input.tool_type == "plain":
                tools.append(PlainToolModel.from_tool_input(tool_input))
            elif tool_input.tool_type == "internet":
                tools.append(
                    InternetToolModel.from_tool_input(tool_input, user_id, bot_id)
                )
            elif tool_input.tool_type == "bedrock_agent":
                tools.append(BedrockAgentToolModel.from_tool_input(tool_input))

        return cls(tools=tools)

    def to_agent(self) -> Agent:
        """Convert to Agent schema while preserving secure strings."""

        tools: List[Tool] = []
        for tool in self.tools:
            if isinstance(tool, InternetToolModel):
                # Special handling for FirecrawlConfigModel
                firecrawl_config = None
                if tool.firecrawl_config:
                    firecrawl_config = FirecrawlConfig(
                        # return the secret ARN as the API key
                        api_key=tool.firecrawl_config.api_key,
                        max_results=tool.firecrawl_config.max_results,
                    )

                tools.append(
                    InternetTool(
                        tool_type="internet",
                        name=tool.name,
                        description=tool.description,
                        search_engine=tool.search_engine,
                        firecrawl_config=firecrawl_config,
                    )
                )
            elif isinstance(tool, BedrockAgentToolModel):
                tools.append(
                    BedrockAgentTool(
                        tool_type="bedrock_agent",
                        name=tool.name,
                        description=tool.description,
                        bedrockAgentConfig=(
                            BedrockAgentConfig(**tool.bedrockAgentConfig.model_dump())
                            if tool.bedrockAgentConfig
                            else None
                        ),
                    )
                )
            else:
                tools.append(
                    PlainTool(
                        tool_type="plain", name=tool.name, description=tool.description
                    )
                )

        return Agent(tools=tools)


class ConversationQuickStarterModel(BaseModel):
    title: str
    example: str


class UsageStatsModel(BaseModel):
    usage_count: int = Field(
        ..., description="The number of times the bot has been used."
    )


class BotModel(BaseModel):
    id: str
    owner_user_id: str
    title: str
    description: str
    instruction: str
    create_time: Float

    # SK
    last_used_time: Float | None
    # GSI-2 PK (SharedScopeIndex)
    shared_scope: type_shared_scope = Field(
        ..., description="`partial` or `all` or None. None means the bot is not shared."
    )
    # GSI-2 SK (SharedScopeIndex)
    shared_status: str = Field(
        ...,
        description="`unshared`, `shared`, or `pinned@xxx` (xxx is a 3-digit integer)",
    )
    allowed_cognito_groups: list[str]
    allowed_cognito_users: list[str]
    # LSI-1 SK (StarredIndex)
    is_starred: bool

    # # This can be used as the bot is public or not. Also used for GSI PK
    # public_bot_id: str | None
    # is_starred: bool

    generation_params: GenerationParamsModel
    agent: AgentModel
    knowledge: KnowledgeModel
    prompt_caching_enabled: bool = True
    sync_status: type_sync_status
    sync_status_reason: str
    sync_last_exec_id: str
    published_api_stack_name: str | None
    published_api_datetime: int | None
    published_api_codebuild_id: str | None
    display_retrieved_chunks: bool
    conversation_quick_starters: list[ConversationQuickStarterModel]
    bedrock_knowledge_base: BedrockKnowledgeBaseModel | None
    bedrock_guardrails: BedrockGuardrailsModel | None
    active_models: ActiveModelsModel  # type: ignore
    usage_stats: UsageStatsModel

    @staticmethod
    def __is_pinned_format(value: str) -> bool:
        """Check if the value matches the 'pinned@xxx' format."""
        if value.startswith("pinned@"):
            parts = value.split("@")
            return len(parts) == 2 and parts[1].isdigit() and len(parts[1]) == 3
        return False

    @field_validator("shared_status")
    def validate_shared_status(cls, value: str) -> str:
        if value in {"unshared", "shared"} or cls.__is_pinned_format(value):
            return value
        raise ValueError(
            f"Invalid shared_status: {value}. Must be 'unshared', 'shared', or 'pinned@xxx' (xxx is a 3-digit integer)."
        )

    @model_validator(mode="after")
    def validate_shared_scope(self) -> Self:
        if self.shared_scope == "private":
            if self.shared_status != "unshared":
                raise ValueError(
                    "shared_status must be 'unshared' when shared_scope is 'private'."
                )
            if self.allowed_cognito_groups or self.allowed_cognito_users:
                raise ValueError(
                    "allowed_cognito_groups and allowed_cognito_users must be empty when shared_scope is 'private'."
                )
        elif self.shared_scope == "partial":
            if self.shared_status == "unshared":
                raise ValueError(
                    "shared_status must be 'shared' or 'pinned@xxx' when shared_scope is 'partial'."
                )
            # if not self.allowed_cognito_groups and not self.allowed_cognito_users:
            #     raise ValueError(
            #         "allowed_cognito_groups or allowed_cognito_users must be set when shared_scope is 'partial'."
            #     )
        elif self.shared_scope == "all":
            if self.shared_status == "unshared":
                raise ValueError(
                    "shared_status must be 'shared' or 'pinned@xxx' when shared_scope is 'all'."
                )
        return self

    @field_validator("published_api_stack_name", mode="after")
    def validate_published_api_stack_name(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        if value is not None:
            if info.data.get("shared_scope") != "all":
                raise ValueError(
                    "published_api_stack_name must be None when shared_scope is not 'all'."
                )
        return value

    def has_knowledge(self) -> bool:
        return (
            len(self.knowledge.source_urls) > 0
            or len(self.knowledge.sitemap_urls) > 0
            or len(self.knowledge.filenames) > 0
            or len(self.knowledge.s3_urls) > 0
            or self.has_bedrock_knowledge_base()
        )

    def is_agent_enabled(self) -> bool:
        # Always consider agents active, even if they have a knowledge base
        return len(self.agent.tools) > 0 or self.has_knowledge()

    def has_bedrock_knowledge_base(self) -> bool:
        return self.bedrock_knowledge_base is not None and (
            self.bedrock_knowledge_base.knowledge_base_id is not None
            or self.bedrock_knowledge_base.exist_knowledge_base_id is not None
        )

    def is_pinned(self) -> bool:
        return self.shared_status.startswith("pinned@")

    def is_accessible_by_user(self, user: User) -> bool:
        """Check if the bot is accessible by the user. This is used for reading the bot."""

        if user.is_admin() or self.owner_user_id == user.id:
            return True

        if self.shared_scope == "private":
            return False

        if self.shared_scope == "all":
            return True

        if user.id in self.allowed_cognito_users:
            return True

        # Check if the user is in the allowed Cognito groups
        user_groups = get_user_cognito_groups(user)
        return any(group in self.allowed_cognito_groups for group in user_groups)

    def is_editable_by_user(self, user: User) -> bool:
        """Check if the bot is editable by the user. This is used for updating and deleting the bot."""
        if user.is_admin():
            return True

        if self.is_owned_by_user(user):
            return True

        return False

    def is_owned_by_user(self, user: User) -> bool:
        """Check if the bot is owned by the user."""
        return self.owner_user_id == user.id

    @classmethod
    def from_input(
        cls, bot_input: BotInput, owner_user_id: str, knowledge: KnowledgeModel
    ) -> Self:
        """Create a BotModel instance. This is used when creating a new bot."""
        current_time = get_current_time()

        agent = AgentModel.from_agent_input(
            agent_input=bot_input.agent if bot_input.agent else None,
            user_id=owner_user_id,
            bot_id=bot_input.id,
        )

        sync_status: type_sync_status = (
            "QUEUED"
            if bot_input.has_knowledge() or bot_input.has_guardrails()
            else "SUCCEEDED"
        )
        logger.debug("sync_status: %s", sync_status)
        logger.debug(f"has_knowledge: {bot_input.has_knowledge()}")
        logger.debug(f"has_guardrails: {bot_input.has_guardrails()}")

        logger.debug(f"bot_input.guarails: {bot_input.bedrock_guardrails}")
        return cls(
            id=bot_input.id,
            owner_user_id=owner_user_id,
            title=bot_input.title,
            description=bot_input.description or "",
            instruction=bot_input.instruction,
            create_time=current_time,
            last_used_time=None,
            shared_scope="private",
            shared_status="unshared",
            allowed_cognito_groups=[],
            allowed_cognito_users=[],
            is_starred=False,
            generation_params=GenerationParamsModel.model_validate(
                (
                    bot_input.generation_params
                    if bot_input.generation_params
                    else GenerationParams(
                        max_tokens=DEFAULT_GENERATION_CONFIG["max_tokens"],
                        top_k=DEFAULT_GENERATION_CONFIG.get("top_k", 0),
                        top_p=DEFAULT_GENERATION_CONFIG["top_p"],
                        temperature=DEFAULT_GENERATION_CONFIG["temperature"],
                        stop_sequences=DEFAULT_GENERATION_CONFIG["stop_sequences"],
                        reasoning_params=ReasoningParams(
                            budget_tokens=DEFAULT_GENERATION_CONFIG.get(
                                "reasoning_params", {}
                            ).get("budget_tokens", 1024)
                        ),
                    )
                ).model_dump()
            ),
            agent=agent,
            knowledge=knowledge,
            prompt_caching_enabled=bot_input.prompt_caching_enabled,
            sync_status=sync_status,
            sync_status_reason="",
            sync_last_exec_id="",
            published_api_stack_name=None,
            published_api_datetime=None,
            published_api_codebuild_id=None,
            display_retrieved_chunks=bot_input.display_retrieved_chunks,
            conversation_quick_starters=(
                []
                if bot_input.conversation_quick_starters is None
                else [
                    ConversationQuickStarterModel(
                        title=starter.title,
                        example=starter.example,
                    )
                    for starter in bot_input.conversation_quick_starters
                ]
            ),
            bedrock_knowledge_base=(
                BedrockKnowledgeBaseModel.model_validate(
                    bot_input.bedrock_knowledge_base.model_dump()
                )
                if bot_input.bedrock_knowledge_base
                else None
            ),
            bedrock_guardrails=(
                BedrockGuardrailsModel.model_validate(
                    bot_input.bedrock_guardrails.model_dump()
                )
                if bot_input.bedrock_guardrails
                else None
            ),
            active_models=ActiveModelsModel.model_validate(
                bot_input.active_models.model_dump()  # type: ignore
            ),
            usage_stats=UsageStatsModel(usage_count=0),
        )

    def to_output(self) -> BotOutput:
        return BotOutput(
            id=self.id,
            title=self.title,
            description=self.description,
            instruction=self.instruction,
            create_time=self.create_time,
            last_used_time=(self.last_used_time or self.create_time),
            shared_scope=self.shared_scope,
            shared_status=self.shared_status,
            allowed_cognito_groups=self.allowed_cognito_groups,
            allowed_cognito_users=self.allowed_cognito_users,
            owner_user_id=self.owner_user_id,
            is_publication=self.published_api_codebuild_id is not None,
            generation_params=GenerationParams.model_validate(
                self.generation_params.model_dump()
            ),
            agent=self.agent.to_agent(),
            knowledge=Knowledge.model_validate(self.knowledge.model_dump()),
            prompt_caching_enabled=self.prompt_caching_enabled,
            sync_status=self.sync_status,
            sync_status_reason=self.sync_status_reason,
            sync_last_exec_id=self.sync_last_exec_id,
            display_retrieved_chunks=self.display_retrieved_chunks,
            conversation_quick_starters=[
                ConversationQuickStarter.model_validate(starter.model_dump())
                for starter in self.conversation_quick_starters
            ],
            bedrock_knowledge_base=(
                BedrockKnowledgeBaseOutput.model_validate(
                    self.bedrock_knowledge_base.model_dump()
                )
                if self.bedrock_knowledge_base
                else None
            ),
            bedrock_guardrails=(
                BedrockGuardrailsOutput.model_validate(
                    self.bedrock_guardrails.model_dump()
                )
                if self.bedrock_guardrails
                else None
            ),
            active_models=ActiveModelsOutput.model_validate(
                self.active_models.model_dump()  # type: ignore
            ),
        )

    def to_summary_output(self, user: User) -> BotSummaryOutput:
        return BotSummaryOutput(
            id=self.id,
            title=self.title,
            description=self.description,
            create_time=self.create_time,
            last_used_time=(self.last_used_time or self.create_time),
            is_starred=self.is_starred,
            has_agent=self.is_agent_enabled(),
            owned=self.is_owned_by_user(user),
            sync_status=self.sync_status,
            has_knowledge=self.has_knowledge(),
            conversation_quick_starters=[
                ConversationQuickStarter(
                    title=starter.title,
                    example=starter.example,
                )
                for starter in self.conversation_quick_starters
            ],
            shared_scope=self.shared_scope,
            shared_status=self.shared_status,
            active_models=ActiveModelsOutput.model_validate(
                self.active_models.model_dump()  # type: ignore
            ),
        )


class BotAliasModel(BaseModel):
    original_bot_id: str = Field(..., description="Original Bot ID")
    owner_user_id: str = Field(..., description="Owner User ID")
    title: str
    description: str

    is_origin_accessible: bool

    create_time: Float
    last_used_time: Float
    is_starred: bool
    sync_status: type_sync_status
    has_knowledge: bool
    has_agent: bool
    conversation_quick_starters: list[ConversationQuickStarterModel]
    active_models: ActiveModelsModel  # type: ignore

    @classmethod
    def from_bot_for_initial_alias(cls, bot: BotModel) -> Self:
        """Create a BotAliasModel instance. This is used when creating a new alias."""
        current_time = get_current_time()
        return cls(
            original_bot_id=bot.id,
            owner_user_id=bot.owner_user_id,
            title=bot.title,
            description=bot.description,
            is_origin_accessible=True,
            create_time=current_time,
            last_used_time=current_time,
            is_starred=False,
            sync_status=bot.sync_status,
            has_knowledge=bot.has_knowledge(),
            has_agent=bot.is_agent_enabled(),
            conversation_quick_starters=bot.conversation_quick_starters,
            active_models=bot.active_models,
        )

    @classmethod
    def from_existing_bot_and_alias(
        cls,
        bot: BotModel,
        alias: Self,
    ) -> Self:
        """Create a BotAliasModel instance. This is used when update alias."""
        return cls(
            original_bot_id=bot.id,
            owner_user_id=bot.owner_user_id,
            title=bot.title,  # Update Title to the latest
            description=bot.description,  # Update Description to the latest
            is_origin_accessible=True,
            create_time=alias.create_time,
            last_used_time=alias.last_used_time or alias.create_time,
            is_starred=alias.is_starred,  # Inherit from existing alias
            sync_status=bot.sync_status,  # Update SyncStatus to the latest
            has_knowledge=bot.has_knowledge(),
            has_agent=bot.is_agent_enabled(),
            conversation_quick_starters=bot.conversation_quick_starters,
            active_models=bot.active_models,
        )

    @classmethod
    def from_dynamo_item(cls, item: dict) -> Self:
        """Create a BotAliasModel instance from a DynamoDB item."""
        # Convert conversation quick starters from dict to model objects
        conversation_quick_starters = []
        for starter in item.get("ConversationQuickStarters", []):
            conversation_quick_starters.append(
                ConversationQuickStarterModel(
                    title=starter.get("title", ""),
                    example=starter.get("example", ""),
                )
            )

        # Handle active models
        active_models_data = item.get("ActiveModels", {})
        active_models = (
            ActiveModelsModel.model_validate(active_models_data)
            if active_models_data
            else default_active_models
        )

        return cls(
            original_bot_id=item["OriginalBotId"],
            owner_user_id=item["OwnerUserId"],
            title=item["Title"],
            description=item["Description"],
            is_origin_accessible=item.get("IsOriginAccessible", False),
            create_time=float(item["CreateTime"]),
            last_used_time=float(item.get("LastUsedTime", item["CreateTime"])),
            is_starred=item.get("IsStarred", "") == "TRUE",
            sync_status=item["SyncStatus"],
            has_knowledge=item.get("HasKnowledge", False),
            has_agent=item.get("HasAgent", False),
            conversation_quick_starters=conversation_quick_starters,
            active_models=active_models,
        )

    def to_summary_output(self, bot: BotModel) -> BotSummaryOutput:
        """Convert to BotSummaryOutput."""
        return BotSummaryOutput(
            id=self.original_bot_id,
            title=self.title,
            description=self.description,
            create_time=self.create_time,
            last_used_time=(self.last_used_time or self.create_time),
            is_starred=self.is_starred,
            has_agent=self.has_agent,
            owned=False,  # Aliases are not owned by the user
            sync_status=self.sync_status,
            has_knowledge=self.has_knowledge,
            conversation_quick_starters=[
                ConversationQuickStarter(
                    title=starter.title,
                    example=starter.example,
                )
                for starter in self.conversation_quick_starters
            ],
            shared_scope=bot.shared_scope,  # Alias inherits shared scope from the original bot
            shared_status=bot.shared_status,  # Alias inherits shared status from the original bot
            active_models=ActiveModelsOutput.model_validate(
                self.active_models.model_dump()  # type: ignore
            ),
        )


class BotMeta(BaseModel):
    id: str = Field(..., description="Bot ID")
    title: str
    description: str
    create_time: Float
    last_used_time: Float
    is_starred: bool
    sync_status: type_sync_status
    has_bedrock_knowledge_base: bool
    # Whether the bot is owned by the user
    owned: bool

    shared_scope: type_shared_scope
    shared_status: str = Field(
        ..., description="private, shared, or pinned@xxx (xxx is a 3-digit integer)"
    )

    # Whether the bot is available or not.
    # This can be `False` if the bot is not owned by the user and original bot is removed or not permitted to use.
    is_origin_accessible: bool

    # is_public: bool
    # # Whether the bot is available or not.
    # # This can be `False` if the bot is not owned by the user and original bot is removed.
    # available: bool

    @classmethod
    def from_dynamo_item(
        cls,
        item: dict,
        owned: bool,
        is_origin_accessible: bool,
        is_starred: bool | None = None,
    ) -> Self:
        _is_starred: bool = (
            is_starred if is_starred is not None else item.get("IsStarred", False)
        )
        assert (
            item["ItemType"].find("BOT") != -1
        ), f"Invalid ItemType: {item['ItemType']}"
        return cls(
            id=item["BotId"],
            title=item["Title"],
            description=item["Description"],
            create_time=item["CreateTime"],
            last_used_time=item.get("LastUsedTime", item["CreateTime"]),
            is_starred=_is_starred,
            sync_status=item["SyncStatus"],
            has_bedrock_knowledge_base=bool(item.get("BedrockKnowledgeBase")),
            owned=owned,
            is_origin_accessible=is_origin_accessible,
            shared_scope=item.get("SharedScope", "private"),
            shared_status=item["SharedStatus"],
        )

    @classmethod
    def from_dynamo_alias_item(
        cls,
        item: dict,
        owned: bool,
        is_origin_accessible: bool,
        is_starred: bool | None = None,
    ) -> Self:
        _is_starred: bool = (
            is_starred if is_starred is not None else item.get("IsStarred", False)
        )
        assert (
            item["ItemType"].find("ALIAS") != -1
        ), f"Invalid ItemType: {item['ItemType']}"
        return cls(
            id=item["OriginalBotId"],
            title=item["Title"],
            description=item["Description"],
            create_time=item["CreateTime"],
            last_used_time=item.get("LastUsedTime", item["CreateTime"]),
            is_starred=_is_starred,
            sync_status=item["SyncStatus"],
            has_bedrock_knowledge_base=bool(item.get("BedrockKnowledgeBase")),
            owned=owned,
            is_origin_accessible=is_origin_accessible,
            shared_scope="private",
            shared_status="unshared",
        )

    @classmethod
    def from_opensearch_response(
        cls,
        hit: dict,
        user_id: str,
    ) -> Self:
        """Create a BotMeta instance from OpenSearch response.

        Args:
            hit: A hit from OpenSearch response
            user_id: Current user's ID to determine if the bot is owned

        Returns:
            BotMeta instance

        Note:
            OpenSearch response structure example:
            {
                "_source": {
                    "BotId": "...",
                    "Title": "...",
                    "Description": "...",
                    "CreateTime": 1234567890,
                    "LastUsedTime": 1234567890,
                    "SyncStatus": "...",
                    "PK": "...",  # owner_user_id
                    "SharedScope": "...",  # might not exist for private bots
                    "SharedStatus": "...",
                    "BedrockKnowledgeBase": {...}  # might not exist
                }
            }
        """
        source = hit["_source"]

        return cls(
            id=source["BotId"],
            title=source["Title"],
            description=source["Description"],
            create_time=float(source["CreateTime"]),
            last_used_time=float(source.get("LastUsedTime", source["CreateTime"])),
            is_starred=source.get("IsStarred", False),
            sync_status=source["SyncStatus"],
            has_bedrock_knowledge_base=bool(source.get("BedrockKnowledgeBase")),
            owned=source["PK"] == user_id,
            is_origin_accessible=True,  # Always True as it's from direct search result
            shared_scope=source.get("SharedScope", "private"),
            shared_status=source["SharedStatus"],
        )

    def to_output(self) -> BotMetaOutput:
        return BotMetaOutput(
            id=self.id,
            title=self.title,
            description=self.description,
            create_time=self.create_time,
            last_used_time=self.last_used_time,
            is_starred=self.is_starred,
            owned=self.owned,
            available=self.is_origin_accessible,
            sync_status=self.sync_status,
            shared_scope=self.shared_scope,
            shared_status=self.shared_status,
        )


class BotMetaWithStackInfo(BaseModel):
    id: str = Field(..., description="Bot ID")
    title: str
    description: str
    create_time: Float
    last_used_time: Float
    sync_status: type_sync_status
    owner_user_id: str
    published_api_stack_name: str | None
    published_api_datetime: int | None
    shared_scope: type_shared_scope
    shared_status: str
