from app.dependencies import check_publish_allowed
from app.routes.schemas.api_publication import (
    ApiKeyInput,
    ApiKeyOutput,
    BotPublishInput,
    BotPublishOutput,
)
from app.usecases.publication import (
    create_bot_publication,
    create_new_api_key,
    fetch_api_key,
    fetch_bot_publication,
    remove_api_key,
    remove_bot_publication,
)
from app.user import User
from fastapi import APIRouter, Depends, Request

router = APIRouter(tags=["api_publication"])


@router.post("/bot/{bot_id}/publication")
def post_bot_publication(
    request: Request,
    bot_id: str,
    bot_publish_input: BotPublishInput,
    pub_check=Depends(check_publish_allowed),
):
    """Publish a bot.
    This method is intended to be used by the bot owner.
    NOTE:
    - If the bot is not shared with the user, raise 400.
    - If the bot is already published, raise 400.
    - If the codebuild for cfn deploy in progress, raise 409.
    """
    current_user: User = request.state.current_user
    create_bot_publication(
        user=current_user, bot_id=bot_id, bot_publish_input=bot_publish_input
    )
    return


@router.get("/bot/{bot_id}/publication", response_model=BotPublishOutput)
def get_bot_publication(
    request: Request,
    bot_id: str,
    pub_check=Depends(check_publish_allowed),
):
    """Get bot publication
    This can be used by both owner and admin.
    NOTE:
    - If not shared yet, returns 404.
    - If codebuild for cfn deploy is not succeeded, All value will be empty except for `codebuild_id`, `codebuild_status` and `cfn_status`.
    """
    current_user: User = request.state.current_user
    publication = fetch_bot_publication(current_user, bot_id)
    return publication


@router.delete("/bot/{bot_id}/publication")
def delete_bot_publication(
    request: Request,
    bot_id: str,
    pub_check=Depends(check_publish_allowed),
):
    """Delete bot publication
    This can be used by both owner and admin.
    NOTE:
    - Can't delete if the bot is not published.
    - If codebuild not completed, raise 400. Before delete, please ensure `codebuild_status` is either `SUCCEEDED` or `FAILED`.
    """
    current_user: User = request.state.current_user
    remove_bot_publication(current_user, bot_id)
    return


@router.get(
    "/bot/{bot_id}/publication/api-key/{api_key_id}", response_model=ApiKeyOutput
)
def get_bot_publication_api_key(
    request: Request,
    bot_id: str,
    api_key_id: str,
    pub_check=Depends(check_publish_allowed),
):
    """Get bot publication API key. Only the owner can access the key."""
    current_user: User = request.state.current_user

    key = fetch_api_key(current_user, bot_id, api_key_id)
    return key


@router.post("/bot/{bot_id}/publication/api-key", response_model=ApiKeyOutput)
def post_bot_publication_api_key(
    request: Request,
    bot_id: str,
    api_key_input: ApiKeyInput,
    pub_check=Depends(check_publish_allowed),
):
    """Create bot publication API key. Only the owner can create the key."""
    current_user: User = request.state.current_user
    created_key = create_new_api_key(current_user, bot_id, api_key_input)
    return created_key


@router.delete("/bot/{bot_id}/publication/api-key/{api_key_id}")
def delete_bot_publication_api_key(
    request: Request,
    bot_id: str,
    api_key_id: str,
    pub_check=Depends(check_publish_allowed),
):
    """Delete bot publication API key.
    This can be used by both owner and admin.
    """
    current_user: User = request.state.current_user

    remove_api_key(current_user, bot_id, api_key_id)
