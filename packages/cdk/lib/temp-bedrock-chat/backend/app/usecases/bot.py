import logging
import os
from typing import Literal, TypeGuard

from app.agents.tools.agent_tool import AgentTool
from app.agents.utils import get_available_tools
from app.config import DEFAULT_GENERATION_CONFIG
from app.config import GenerationParams as GenerationParamsDict
from app.repositories.common import RecordNotFoundError
from app.repositories.custom_bot import (
    alias_exists,
    delete_alias_by_id,
    delete_bot_by_id,
    find_alias_by_bot_id,
    find_bot_by_id,
    find_owned_bots_by_user_id,
    find_pinned_public_bots,
    find_recently_used_bots_by_user_id,
    find_starred_bots_by_user_id,
    remove_alias_last_used_time,
    remove_bot_last_used_time,
    store_alias,
    store_bot,
    update_alias_is_origin_accessible,
    update_alias_last_used_time,
    update_alias_star_status,
    update_bot,
    update_bot_last_used_time,
    update_bot_shared_status,
    update_bot_star_status,
    update_bot_stats,
)
from app.repositories.models.custom_bot import (
    ActiveModelsModel,
    AgentModel,
    BotAliasModel,
    BotModel,
    ConversationQuickStarterModel,
    GenerationParamsModel,
    KnowledgeModel,
    ReasoningParamsModel,
)
from app.repositories.models.custom_bot_guardrails import BedrockGuardrailsModel
from app.repositories.models.custom_bot_kb import BedrockKnowledgeBaseModel
from app.routes.schemas.admin import (
    PushBotInput,
    PushBotInputPinned,
    PushBotInputUnpinned,
)
from app.routes.schemas.bot import (
    ActiveModelsOutput,
    Agent,
    AllVisibilityInput,
    BedrockAgentTool,
    BotInput,
    BotMetaOutput,
    BotModifyInput,
    BotModifyOutput,
    BotOutput,
    BotSummaryOutput,
    BotSwitchVisibilityInput,
    ConversationQuickStarter,
    GenerationParams,
    InternetTool,
    Knowledge,
    PartialVisibilityInput,
    PlainTool,
    PrivateVisibilityInput,
    Tool,
    type_shared_scope,
    type_sync_status,
)
from app.routes.schemas.bot_guardrails import BedrockGuardrailsOutput
from app.routes.schemas.bot_kb import BedrockKnowledgeBaseOutput
from app.user import User
from app.utils import (
    compose_upload_document_s3_path,
    compose_upload_temp_s3_path,
    compose_upload_temp_s3_prefix,
    delete_file_from_s3,
    delete_files_with_prefix_from_s3,
    generate_presigned_url,
    get_current_time,
    move_file_in_s3,
    store_api_key_to_secret_manager,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

DOCUMENT_BUCKET = os.environ.get("DOCUMENT_BUCKET", "bedrock-documents")


def _update_s3_documents_by_diff(
    user_id: str,
    bot_id: str,
    added_filenames: list[str],
    deleted_filenames: list[str],
):
    for filename in added_filenames:
        tmp_path = compose_upload_temp_s3_path(user_id, bot_id, filename)
        document_path = compose_upload_document_s3_path(user_id, bot_id, filename)
        move_file_in_s3(DOCUMENT_BUCKET, tmp_path, document_path)

    for filename in deleted_filenames:
        document_path = compose_upload_document_s3_path(user_id, bot_id, filename)

        # Ignore errors when deleting a non-existent file from the S3 bucket used in knowledge bases.
        # This allows users to update bot if the uploaded file is missing after the bot is created.
        delete_file_from_s3(DOCUMENT_BUCKET, document_path, ignore_not_exist=True)


def create_new_bot(user: User, bot_input: BotInput) -> BotOutput:
    """Create a new bot.
    Bot is created as private.
    """

    # Create initial knowledge
    source_urls = []
    sitemap_urls = []
    filenames = []
    s3_urls = []
    if bot_input.knowledge:
        source_urls = bot_input.knowledge.source_urls
        sitemap_urls = bot_input.knowledge.sitemap_urls
        s3_urls = bot_input.knowledge.s3_urls

        # Commit changes to S3
        _update_s3_documents_by_diff(
            user.id, bot_input.id, bot_input.knowledge.filenames, []
        )
        # Delete files from upload temp directory
        delete_files_with_prefix_from_s3(
            DOCUMENT_BUCKET, compose_upload_temp_s3_prefix(user.id, bot_input.id)
        )
        filenames = bot_input.knowledge.filenames

    knowledge = KnowledgeModel(
        source_urls=source_urls,
        sitemap_urls=sitemap_urls,
        filenames=filenames,
        s3_urls=s3_urls,
    )

    new_bot = BotModel.from_input(bot_input, owner_user_id=user.id, knowledge=knowledge)
    store_bot(new_bot)

    return new_bot.to_output()


def modify_owned_bot(
    user: User, bot_id: str, modify_input: BotModifyInput
) -> BotModifyOutput:
    """Modify owned bot."""
    bot = find_bot_by_id(bot_id)

    if not bot.is_editable_by_user(user):
        raise PermissionError(
            f"User {user.id} is not authorized to modify bot {bot_id}"
        )

    source_urls = []
    sitemap_urls = []
    filenames = []
    s3_urls = []
    sync_status: type_sync_status = "QUEUED"

    if modify_input.knowledge:
        source_urls = modify_input.knowledge.source_urls
        sitemap_urls = modify_input.knowledge.sitemap_urls
        s3_urls = modify_input.knowledge.s3_urls

        # Commit changes to S3
        _update_s3_documents_by_diff(
            user.id,
            bot_id,
            modify_input.knowledge.added_filenames,
            modify_input.knowledge.deleted_filenames,
        )
        # Delete files from upload temp directory
        delete_files_with_prefix_from_s3(
            DOCUMENT_BUCKET, compose_upload_temp_s3_prefix(bot.owner_user_id, bot_id)
        )

        filenames = (
            modify_input.knowledge.added_filenames
            + modify_input.knowledge.unchanged_filenames
        )

    generation_params = (
        GenerationParamsModel(
            max_tokens=modify_input.generation_params.max_tokens,
            top_k=modify_input.generation_params.top_k,
            top_p=modify_input.generation_params.top_p,
            temperature=modify_input.generation_params.temperature,
            stop_sequences=modify_input.generation_params.stop_sequences,
            reasoning_params=ReasoningParamsModel(
                budget_tokens=modify_input.generation_params.reasoning_params.budget_tokens
            ),
        )
        if modify_input.generation_params
        else GenerationParamsModel.model_validate(DEFAULT_GENERATION_CONFIG)
    )

    # if knowledge is not updated, skip embeding process.
    # 'sync_status = "QUEUED"' will execute embeding process and update dynamodb record.
    # 'sync_status= "SUCCEEDED"' will update only dynamodb record.
    sync_status = (
        "QUEUED"
        if modify_input.is_embedding_required(bot)
        or modify_input.is_guardrails_update_required(bot)
        else "SUCCEEDED"
    )

    # Use the existing knowledge base (KB) configuration if available, as it may have been set externally
    # by a Step Functions state machine for embedding processes e.g. data source id. If a new KB configuration is provided,
    # merge it with the existing one; otherwise, retain the current KB settings.
    current_bot_kb = bot.bedrock_knowledge_base
    updated_kb: BedrockKnowledgeBaseModel | None = None
    if modify_input.bedrock_knowledge_base:
        updated_kb = (
            current_bot_kb.model_copy(
                update=modify_input.bedrock_knowledge_base.model_dump()
            )
            if current_bot_kb
            else BedrockKnowledgeBaseModel(
                **modify_input.bedrock_knowledge_base.model_dump()
            )
        )
    else:
        updated_kb = current_bot_kb

    update_bot(
        bot.owner_user_id,
        bot_id,
        title=modify_input.title,
        instruction=modify_input.instruction,
        description=modify_input.description if modify_input.description else "",
        generation_params=generation_params,
        agent=AgentModel.from_agent_input(
            modify_input.agent, bot.owner_user_id, bot_id
        ),
        knowledge=KnowledgeModel(
            source_urls=source_urls,
            sitemap_urls=sitemap_urls,
            filenames=filenames,
            s3_urls=s3_urls,
        ),
        prompt_caching_enabled=modify_input.prompt_caching_enabled,
        sync_status=sync_status,
        sync_status_reason="",
        display_retrieved_chunks=modify_input.display_retrieved_chunks,
        conversation_quick_starters=(
            []
            if modify_input.conversation_quick_starters is None
            else [
                ConversationQuickStarterModel(
                    title=starter.title,
                    example=starter.example,
                )
                for starter in modify_input.conversation_quick_starters
            ]
        ),
        bedrock_knowledge_base=updated_kb,
        bedrock_guardrails=(
            BedrockGuardrailsModel(**modify_input.bedrock_guardrails.model_dump())
            if modify_input.bedrock_guardrails
            else None
        ),
        active_models=ActiveModelsOutput.model_validate(
            modify_input.active_models.model_dump()  # type: ignore
        ),
    )

    return BotModifyOutput(
        id=bot_id,
        title=modify_input.title,
        instruction=modify_input.instruction,
        description=modify_input.description if modify_input.description else "",
        generation_params=GenerationParams.model_validate(
            generation_params.model_dump()
        ),
        agent=(
            Agent.model_validate(modify_input.agent.model_dump())
            if modify_input.agent
            else Agent.model_validate({"tool": []})
        ),
        knowledge=Knowledge(
            source_urls=source_urls,
            sitemap_urls=sitemap_urls,
            filenames=filenames,
            s3_urls=s3_urls,
        ),
        prompt_caching_enabled=modify_input.prompt_caching_enabled,
        conversation_quick_starters=(
            []
            if modify_input.conversation_quick_starters is None
            else [
                ConversationQuickStarter(
                    title=starter.title,
                    example=starter.example,
                )
                for starter in modify_input.conversation_quick_starters
            ]
        ),
        bedrock_knowledge_base=(
            BedrockKnowledgeBaseOutput(
                **(modify_input.bedrock_knowledge_base.model_dump())
            )
            if modify_input.bedrock_knowledge_base
            else None
        ),
        bedrock_guardrails=(
            BedrockGuardrailsOutput(**modify_input.bedrock_guardrails.model_dump())
            if modify_input.bedrock_guardrails
            else None
        ),
        active_models=ActiveModelsOutput.model_validate(
            modify_input.active_models.model_dump()  # type: ignore
        ),
    )


def fetch_bot(user: User, bot_id: str) -> tuple[bool, BotModel]:
    """Fetch bot by id.
    The first element of the returned tuple is whether the bot is owned or not.
    `True` means the bot is owned by the user.
    `False` means the bot is shared by another user.
    """
    logger.info(f"[fetch_bot] Starting with user_id={user.id}, bot_id={bot_id}")
    try:
        bot = find_bot_by_id(bot_id)
        logger.info(f"[fetch_bot] Bot found: id={bot.id}, owner={bot.owner_user_id}")
    except RecordNotFoundError as e:
        # NOTE: If the bot is not found, it must be an alias.
        logger.error(f"[fetch_bot] Bot {bot_id} is not found. Error: {str(e)}")
        logger.info(f"[fetch_bot] Updating alias for user_id={user.id}, bot_id={bot_id}")
        update_alias_is_origin_accessible(user.id, bot_id, False)
        raise e

    if not bot.is_accessible_by_user(user):
        # NOTE: If the bot is not accessible, it must be an alias.
        logger.info(
            f"User {user.id} is not authorized to access bot {bot_id}. Update alias."
        )
        update_alias_is_origin_accessible(user.id, bot_id, False)
        raise PermissionError(
            f"User {user.id} is not authorized to access bot {bot_id}"
        )

    owned = bot.is_owned_by_user(user)

    return owned, bot


def fetch_all_bots(
    user: User,
    limit: int | None = None,
    starred: bool = False,
    kind: Literal["private", "mixed"] = "private",
) -> list[BotMetaOutput]:
    """Fetch all bots.
    The order is descending by `last_used_time`.
    - If `kind` is `private`, only private bots will be returned.
        - If `mixed` must give either `starred` or `limit`.
    - If `starred` is True, only starred bots will be returned.
        - When kind is `private`, this will be ignored.
    - If `limit` is specified, only the first n bots will be returned.
        - Cannot specify both `starred` and `limit`.
    """

    if kind == "mixed" and not starred and not limit:
        raise ValueError(
            "Must specify either `limit` or `starred when mixed specified`"
        )
    if limit and starred:
        raise ValueError("Cannot specify both `limit` and `starred`")
    if limit and (limit < 0 or limit > 100):
        raise ValueError("Limit must be between 0 and 100")

    bots = []
    if kind == "private":
        # Fetch only private owned bots by user
        bots = find_owned_bots_by_user_id(user.id, limit=limit)
    elif kind == "mixed":
        if starred:
            # Fetch starred bots
            bots = find_starred_bots_by_user_id(user.id, limit=limit)
        else:
            # Fetch recently used bots
            bots = find_recently_used_bots_by_user_id(user.id, limit=limit)

    bot_metas = []
    for bot in bots:
        bot_metas.append(bot.to_output())
    return bot_metas


def fetch_all_pinned_bots(user: User) -> list[BotMetaOutput]:
    """Fetch all pinned bots. Currently, only public pinned bots are supported."""
    bots = find_pinned_public_bots()
    bot_metas = []
    for bot in bots:
        bot_metas.append(bot.to_output())
    return bot_metas


def fetch_bot_summary(user: User, bot_id: str) -> BotSummaryOutput:
    logger.info(f"Fetch bot summary: {bot_id} by user {user.id}")

    bot = find_bot_by_id(bot_id)
    if not bot.is_accessible_by_user(user):
        if alias_exists(user.id, bot_id):
            delete_alias_by_id(user.id, bot_id)
        raise PermissionError(
            f"User {user.id} is not authorized to access bot {bot_id}"
        )

    logger.debug(f"Bot: {bot}")
    logger.debug(f"User: {user}")
    logger.debug(f"bot.is_accessible_by_user(user): {bot.is_accessible_by_user(user)}")

    if not bot.is_owned_by_user(user):
        try:
            existing_alias = find_alias_by_bot_id(user.id, bot_id)
            new_alias = BotAliasModel.from_existing_bot_and_alias(
                bot=bot, alias=existing_alias
            )
        except RecordNotFoundError:
            logger.info(f"Alias {bot_id} is not found. Create alias.")
            new_alias = BotAliasModel.from_bot_for_initial_alias(bot)

        logger.info(f"Update alias with: {new_alias}")
        store_alias(user_id=user.id, alias=new_alias)
        return new_alias.to_summary_output(bot)

    return bot.to_summary_output(user)


def modify_star_status(user: User, bot_id: str, starred: bool):
    """Modify bot pin status."""
    bot = find_bot_by_id(bot_id)
    if not bot.is_accessible_by_user(user):
        raise PermissionError(
            f"User {user.id} is not authorized to access bot {bot_id}"
        )

    if bot.is_owned_by_user(user):
        return update_bot_star_status(user.id, bot_id, starred)
    else:
        return update_alias_star_status(user.id, bot_id, starred)


def remove_bot_by_id(user: User, bot_id: str):
    """Remove bot by id."""
    bot = find_bot_by_id(bot_id)
    if bot.is_pinned():
        raise ValueError(
            f"Bot {bot_id} is pinned by an administrator and cannot be deleted."
        )
    if not bot.is_editable_by_user(user):
        raise PermissionError(
            f"User {user.id} is not authorized to access bot {bot_id}"
        )

    if bot.is_editable_by_user(user):
        owner_user_id = bot.owner_user_id
        delete_bot_by_id(owner_user_id, bot_id)
    else:
        delete_alias_by_id(user.id, bot_id)


def modify_bot_visibility(
    user: User, bot_id: str, visibility_input: BotSwitchVisibilityInput
):
    """Modify bot visibility."""
    bot = find_bot_by_id(bot_id)
    if not bot.is_editable_by_user(user):
        raise PermissionError(f"User {user.id} is not authorized to edit bot {bot_id}")

    def _is_private_visibility_input(
        input: BotSwitchVisibilityInput,
    ) -> TypeGuard[PrivateVisibilityInput]:
        return input.target_shared_scope == "private"

    def _is_partial_visibility_input(
        input: BotSwitchVisibilityInput,
    ) -> TypeGuard[PartialVisibilityInput]:
        return input.target_shared_scope == "partial"

    def _is_all_visibility_input(
        input: BotSwitchVisibilityInput,
    ) -> TypeGuard[AllVisibilityInput]:
        return input.target_shared_scope == "all"

    # Current scope and target scope
    current_scope_priority = {"all": 3, "partial": 2, "private": 1}
    target_shared_scope: type_shared_scope = visibility_input.target_shared_scope
    target_shared_status = "unshared"

    # Check if the request narrows the scope and the bot is pinned
    if (
        bot.shared_status.startswith("pinned@")
        and current_scope_priority[bot.shared_scope]
        > current_scope_priority[target_shared_scope]
    ):
        raise ValueError(
            f"Bot {bot_id} is pinned by an administrator and cannot have its scope narrowed from "
            f"'{bot.shared_scope}' to '{target_shared_scope}'."
        )

    # Check if the bot is published
    if bot.published_api_stack_name:
        raise ValueError(
            f"Bot {bot_id} is published and cannot have its visibility changed."
        )

    # Process based on the target scope
    if _is_private_visibility_input(visibility_input):
        target_allowed_user_ids = []
        target_allowed_group_ids = []
    elif _is_partial_visibility_input(visibility_input) or _is_all_visibility_input(
        visibility_input
    ):
        if _is_partial_visibility_input(visibility_input):
            target_allowed_user_ids = visibility_input.target_allowed_user_ids
            target_allowed_group_ids = visibility_input.target_allowed_group_ids

            # Note: If the specified user or group ID is not found, an error should be thrown.
            # However, the current implementation does not check this because Frontend will care about it.
        else:
            # If to all, clear the allowed user and group IDs.
            target_allowed_user_ids = []
            target_allowed_group_ids = []

        if bot.shared_status != "unshared":
            # If the bot is shared, keep the shared status.
            target_shared_status = bot.shared_status
        else:
            # If the bot is private, it will be shared.
            target_shared_status = "shared"
    else:
        raise ValueError("Invalid visibility input")

    update_bot_shared_status(
        bot.owner_user_id,
        bot_id,
        target_shared_scope,
        target_shared_status,
        target_allowed_user_ids,
        target_allowed_group_ids,
    )


def modify_pinning_status(bot_id: str, push_input: PushBotInput):
    """Modify bot pin status."""
    bot = find_bot_by_id(bot_id)

    def _is_push_bot_input_pinned(
        input: PushBotInput,
    ) -> TypeGuard[PushBotInputPinned]:
        return input.to_pinned

    if bot.shared_scope == "private":
        raise ValueError(f"Bot {bot_id} is private bot. Cannot pin/unpin.")
    elif bot.shared_scope == "partial":
        raise ValueError(
            f"Bot {bot_id} is partial shared bot. Currently unsupported to pin/unpin."
        )

    if _is_push_bot_input_pinned(push_input):
        shared_status = f"pinned@{str(push_input.order).zfill(3)}"
    else:
        shared_status = "shared"

    update_bot_shared_status(
        bot.owner_user_id,
        bot_id,
        bot.shared_scope,  # Keep the current shared scope
        shared_status,
        bot.allowed_cognito_users,
        bot.allowed_cognito_groups,
    )


def modify_bot_last_used_time(user: User, bot: BotModel):
    """Modify bot last used time."""
    if bot.is_owned_by_user(user):
        return update_bot_last_used_time(user.id, bot.id)
    else:
        return update_alias_last_used_time(user.id, bot.id)


def modify_bot_stats(user: User, bot: BotModel, increment: int):
    """Modify bot stats."""
    if bot.is_owned_by_user(user):
        owner_id = user.id
    else:
        owner_id = bot.owner_user_id

    return update_bot_stats(owner_id, bot.id, increment)


def issue_presigned_url(
    user: User, bot_id: str, filename: str, content_type: str
) -> str:
    response = generate_presigned_url(
        DOCUMENT_BUCKET,
        compose_upload_temp_s3_path(user.id, bot_id, filename),
        content_type=content_type,
        expiration=3600,
        client_method="put_object",
    )
    return response


def remove_bot_from_recently_used(user: User, bot_id: str):
    """Remove bot from recently used bots by removing LastUsedTime attribute."""
    try:
        bot = find_bot_by_id(bot_id)
    except RecordNotFoundError as e:
        # NOTE: If the bot is not found, delete alias
        logger.info(f"Bot {bot_id} is not found. Delete alias.")
        return delete_alias_by_id(user.id, bot_id)

    if bot.is_owned_by_user(user):
        logger.debug(
            f"Bot {bot_id} is owned by user {user.id}. Removing last used time..."
        )
        return remove_bot_last_used_time(user.id, bot_id)
    else:
        logger.debug(
            f"Bot {bot_id} is not owned by user {user.id}. Removing alias last used time..."
        )
        return remove_alias_last_used_time(user.id, bot_id)


def remove_uploaded_file(user: User, bot_id: str, filename: str):
    # Ignore errors when deleting a non-existent file from the S3 bucket used in knowledge bases.
    # This allows users to update bot if the uploaded file is missing after the bot is created.
    delete_file_from_s3(
        DOCUMENT_BUCKET,
        compose_upload_temp_s3_path(user.id, bot_id, filename),
        ignore_not_exist=True,
    )
    return


def fetch_available_agent_tools() -> list[Tool]:
    """Fetch available tools for bot."""
    tools: list[AgentTool] = get_available_tools()
    result: list[Tool] = []
    for tool in tools:
        if tool.name == "bedrock_agent":
            result.append(
                BedrockAgentTool(
                    tool_type="bedrock_agent",
                    name=tool.name,
                    description=tool.description,
                )
            )
        elif tool.name == "internet_search":
            result.append(
                InternetTool(
                    tool_type="internet",
                    name=tool.name,
                    description=tool.description,
                    search_engine="duckduckgo",
                )
            )
        else:
            result.append(
                PlainTool(
                    tool_type="plain", name=tool.name, description=tool.description
                )
            )

    return result
