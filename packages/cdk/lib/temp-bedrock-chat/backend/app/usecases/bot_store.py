import logging

from app.repositories.bot_store import (
    find_bots_by_query,
    find_bots_sorted_by_usage_count,
    find_random_bots,
    find_bots_by_filters,
)
from app.repositories.custom_bot import find_starred_bots_by_user_id
from app.routes.schemas.bot import BotMetaOutput
from app.routes.schemas.bot_guardrails import BedrockGuardrailsOutput
from app.routes.schemas.bot_kb import BedrockKnowledgeBaseOutput
from app.user import User

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def search_bots(
    user: User,
    query: str = None,
    scope: str = None,
    starred: bool = None,
    limit: int = 20,
    sort: str = "usage",
) -> list[BotMetaOutput]:
    """Search bots by query string with filtering options."""

    # Special handling for starred filter
    if starred is True:
        # First get starred bot IDs from DynamoDB
        starred_bots = find_starred_bots_by_user_id(user.id)
        starred_bot_ids = {bot.id for bot in starred_bots}

        # If no starred bots, return empty list
        if not starred_bot_ids:
            return []

        # Get bots from OpenSearch with starred bot IDs filter
        if not query and sort == "usage":
            bots = find_bots_by_filters(
                user,
                scope=scope,
                limit=limit,
                starred_bot_ids=starred_bot_ids,
            )
        else:
            bots = find_bots_by_query(
                query,
                user,
                scope=scope,
                limit=limit,
                sort=sort,
                starred_bot_ids=starred_bot_ids,
            )

        # Set is_starred flag for all results (they're all starred by definition)
        for bot in bots:
            bot.is_starred = True

        bot_metas = [bot.to_output() for bot in bots]
        return bot_metas

    # Normal search without starred filter
    if not query and sort == "usage":
        bots = find_bots_by_filters(
            user,
            scope=scope,
            limit=limit,
        )
    else:
        bots = find_bots_by_query(
            query,
            user,
            scope=scope,
            limit=limit,
            sort=sort,
        )

    # If starred is False or None, we need to check DynamoDB for starred status
    if starred is False or starred is None:
        # Get starred bot IDs from DynamoDB
        starred_bots = find_starred_bots_by_user_id(user.id)
        starred_bot_ids = {bot.id for bot in starred_bots}

        # Update is_starred flag for each bot
        for bot in bots:
            bot.is_starred = bot.id in starred_bot_ids

    # Filter out starred bots if starred is False
    if starred is False:
        bots = [bot for bot in bots if not bot.is_starred]

    bot_metas = [bot.to_output() for bot in bots]
    return bot_metas


def fetch_popular_bots(
    user: User,
    limit: int = 20,
) -> list[BotMetaOutput]:
    """Search bots sorted by usage count.
    This method is used for bot-store functionality (Popular bots).
    """
    bots = find_bots_sorted_by_usage_count(
        user,
        limit=limit,
    )

    # Get starred bot IDs from DynamoDB
    starred_bots = find_starred_bots_by_user_id(user.id)
    starred_bot_ids = {bot.id for bot in starred_bots}

    # Update is_starred flag for each bot
    for bot in bots:
        bot.is_starred = bot.id in starred_bot_ids

    bot_metas = [bot.to_output() for bot in bots]
    return bot_metas


def fetch_pickup_bots(
    user: User,
    limit: int = 20,
) -> list[BotMetaOutput]:
    """Search bots sorted by usage count.
    This method is used for bot-store functionality (Today's pickup bots).
    """
    bots = find_random_bots(
        user,
        limit=limit,
    )

    # Get starred bot IDs from DynamoDB
    starred_bots = find_starred_bots_by_user_id(user.id)
    starred_bot_ids = {bot.id for bot in starred_bots}

    # Update is_starred flag for each bot
    for bot in bots:
        bot.is_starred = bot.id in starred_bot_ids

    bot_metas = [bot.to_output() for bot in bots]
    return bot_metas
