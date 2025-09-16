import logging
from typing import Any, Dict, Literal

from app.repositories.custom_bot import find_bot_by_id
from app.routes.schemas.bot import (
    ActiveModelsOutput,
    Agent,
    BedrockGuardrailsOutput,
    BedrockKnowledgeBaseOutput,
    BotInput,
    BotMetaOutput,
    BotModifyInput,
    BotOutput,
    BotPresignedUrlOutput,
    BotStarredInput,
    BotSummaryOutput,
    BotSwitchVisibilityInput,
    ConversationQuickStarter,
    FirecrawlConfig,
    GenerationParams,
    Knowledge,
    PlainTool,
)
from app.routes.schemas.conversation import type_model_name
from app.usecases.bot import (
    create_new_bot,
    fetch_all_bots,
    fetch_all_pinned_bots,
    fetch_available_agent_tools,
    fetch_bot_summary,
    issue_presigned_url,
    modify_bot_visibility,
    modify_owned_bot,
    modify_star_status,
    remove_bot_by_id,
    remove_bot_from_recently_used,
    remove_uploaded_file,
)
from app.user import User
from fastapi import APIRouter, Depends, Request

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter(tags=["bot"])


@router.post("/bot", response_model=BotOutput)
def post_bot(
    request: Request,
    bot_input: BotInput,
):
    """Create new private owned bot."""
    current_user: User = request.state.current_user

    return create_new_bot(current_user, bot_input)


@router.patch("/bot/{bot_id}")
def patch_bot(request: Request, bot_id: str, modify_input: BotModifyInput):
    """Modify owned bot title, instruction and description."""
    current_user: User = request.state.current_user

    return modify_owned_bot(current_user, bot_id, modify_input)


@router.patch("/bot/{bot_id}/starred")
def patch_bot_star_status(
    request: Request, bot_id: str, starred_input: BotStarredInput
):
    """Modify owned bot star status."""
    current_user: User = request.state.current_user
    return modify_star_status(current_user, bot_id, starred=starred_input.starred)


@router.patch("/bot/{bot_id}/visibility")
def patch_bot_shared_status(
    request: Request, bot_id: str, visibility_input: BotSwitchVisibilityInput
):
    """Switch bot visibility"""
    current_user: User = request.state.current_user
    modify_bot_visibility(current_user, bot_id, visibility_input)


@router.get("/bot", response_model=list[BotMetaOutput])
def get_all_bots(
    request: Request,
    kind: Literal["private", "mixed"] = "private",
    starred: bool = False,
    limit: int | None = None,
):
    """Get all bots. The order is descending by `last_used_time`.
    - If `kind` is `private`, only private bots will be returned.
        - If `mixed` must give either `starred` or `limit`.
    - If `starred` is True, only starred bots will be returned.
        - When kind is `private`, this will be ignored.
    - If `limit` is specified, only the first n bots will be returned.
        - Cannot specify both `starred` and `limit`.
    """
    current_user: User = request.state.current_user

    bots = fetch_all_bots(current_user, limit, starred, kind)
    return bots


@router.get("/bot/pinned", response_model=list[BotMetaOutput])
def get_all_pinned_bots(request: Request):
    """Get all pinned bots. Currently, only pinned public bots are supported."""
    current_user: User = request.state.current_user

    bots = fetch_all_pinned_bots(current_user)
    return bots


@router.get("/bot/private/{bot_id}", response_model=BotOutput)
def get_private_bot(request: Request, bot_id: str):
    """Get private bot by id."""
    current_user: User = request.state.current_user

    bot = find_bot_by_id(bot_id)
    if not bot.is_owned_by_user(current_user):
        raise PermissionError("The bot is not owned by the user.")

    return bot.to_output()


@router.get("/bot/summary/{bot_id}", response_model=BotSummaryOutput)
def get_bot_summary(request: Request, bot_id: str):
    """Get bot summary by id."""
    current_user: User = request.state.current_user

    return fetch_bot_summary(current_user, bot_id)


@router.delete("/bot/{bot_id}")
def delete_bot(request: Request, bot_id: str):
    """Delete bot by id. This can be used for both owned and shared bots.
    If the bot is shared, just remove the alias.
    """
    current_user: User = request.state.current_user
    remove_bot_by_id(current_user, bot_id)


@router.get("/bot/{bot_id}/presigned-url", response_model=BotPresignedUrlOutput)
def get_bot_presigned_url(
    request: Request, bot_id: str, filename: str, contentType: str
):
    """Get presigned url for bot"""
    current_user: User = request.state.current_user
    url = issue_presigned_url(current_user, bot_id, filename, contentType)
    return BotPresignedUrlOutput(url=url)


@router.delete("/bot/{bot_id}/uploaded-file")
def delete_bot_uploaded_file(request: Request, bot_id: str, filename: str):
    """Delete uploaded file for bot"""
    current_user: User = request.state.current_user
    remove_uploaded_file(current_user, bot_id, filename)


@router.delete("/bot/{bot_id}/recently-used")
def remove_bot_from_recent_history(request: Request, bot_id: str):
    """Remove bot from recently used bots history by removing LastUsedTime attribute."""
    current_user: User = request.state.current_user
    remove_bot_from_recently_used(current_user, bot_id)
    return {"message": f"Bot {bot_id} removed from recently used bots history"}


@router.get("/bot/{bot_id}/agent/available-tools", response_model=list[PlainTool])
def get_bot_available_tools(request: Request, bot_id: str):
    """Get available tools for bot"""
    tools = fetch_available_agent_tools()
    return [
        PlainTool(tool_type="plain", name=tool.name, description=tool.description)
        for tool in tools
    ]
