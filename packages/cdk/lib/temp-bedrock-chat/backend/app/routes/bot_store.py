from app.routes.schemas.bot import BotMetaOutput
from app.usecases.bot_store import fetch_pickup_bots, fetch_popular_bots, search_bots
from app.user import User
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(tags=["bot_store"])


@router.get("/store/search", response_model=list[BotMetaOutput])
def search_bots_by_query(
    request: Request,
    query: str = None,  # Make query optional
    scope: str = None,  # 'all' | 'organization' | 'private'
    starred: bool = None,  # Filter by starred bots only
    limit: int = 20,
    sort: str = "usage",  # 'usage' | 'relevance' (default: usage)
):
    """Search bots by query string with filtering options.
    - This method is used for bot-store functionality.
    - Results include private bots if the user is the owner.
    - Only accessible bots are returned.
    - If admin, partial shared bots not accessible by the admin are returned.
    - Supports filtering by scope (all/organization/private) and starred status.
    - Can sort by usage count or search relevance.
    """
    current_user: User = request.state.current_user

    try:
        bots = search_bots(
            current_user,
            query=query,
            scope=scope,
            starred=starred,
            limit=limit,
            sort=sort
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return bots


@router.get("/store/popular", response_model=list[BotMetaOutput])
def get_popular_bots(
    request: Request,
    limit: int = 20,
):
    """Search bots by query string.
    - This method is used for bot-store functionality (Popular bots).
    - Results do NOT include private bots.
    - Only accessible bots are returned.
    - The order is based on the usage count.
    """
    current_user: User = request.state.current_user

    bots = fetch_popular_bots(current_user, limit)
    return bots


@router.get("/store/pickup", response_model=list[BotMetaOutput])
def get_pickup_bots(
    request: Request,
    limit: int = 20,
):
    """Search bots by query string.
    - This method is used for bot-store functionality (Today's pickup bots).
    - Results do NOT include private bots.
    - Only accessible bots are returned.
    - Random bots are returned.
    """
    current_user: User = request.state.current_user

    bots = fetch_pickup_bots(current_user, limit)
    return bots
