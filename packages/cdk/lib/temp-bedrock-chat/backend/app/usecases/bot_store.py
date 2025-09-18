import logging

from app.repositories.bot_store import (
    find_bots_by_query,
    find_bots_sorted_by_usage_count,
    find_random_bots,
    find_bots_by_filters,
)
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
    # If no query is provided and sort is 'usage', use the sorted by usage count function
    if not query and sort == "usage":
        bots = find_bots_by_filters(
            user,
            scope=scope,
            starred=starred,
            limit=limit,
        )
    else:
        bots = find_bots_by_query(
            query,
            user,
            scope=scope,
            starred=starred,
            limit=limit,
            sort=sort,
        )
    bot_metas = []
    for bot in bots:
        bot_metas.append(bot.to_output())
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
    bot_metas = []
    for bot in bots:
        bot_metas.append(bot.to_output())
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
    bot_metas = []
    for bot in bots:
        bot_metas.append(bot.to_output())
    return bot_metas
