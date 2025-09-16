import logging
import os

from app.repositories.api_publication import (
    create_api_key,
    delete_api_key,
    delete_stack_by_bot_id,
    find_api_key_by_id,
    find_build_status_by_build_id,
    find_stack_by_bot_id,
    find_usage_plan_by_id,
)
from app.repositories.common import RecordNotFoundError, ResourceConflictError
from app.repositories.custom_bot import (
    delete_bot_publication,
    find_bot_by_id,
    update_bot_publication,
)
from app.repositories.models.custom_bot import BotModel
from app.routes.schemas.api_publication import (
    ApiKeyInput,
    ApiKeyOutput,
    BotPublishInput,
    BotPublishOutput,
    PublishedApiQuota,
    PublishedApiThrottle,
)
from app.user import User
from app.utils import start_codebuild_project

logger = logging.getLogger(__name__)
REGION = os.environ.get("REGION", "us-east-1")


def _fetch_bot_with_permission_check(user: User, bot_id: str) -> BotModel:
    bot = find_bot_by_id(bot_id)
    if not bot.is_accessible_by_user(user):
        raise PermissionError(
            f"User {user.id} is not authorized to access bot {bot_id}"
        )
    return bot


def create_bot_publication(user: User, bot_id: str, bot_publish_input: BotPublishInput):
    """Publish an API for the bot."""
    # Check existence and permission of the bot
    bot = find_bot_by_id(bot_id)
    if not bot.is_editable_by_user(user):
        raise PermissionError(
            f"User {user.id} is not authorized to access bot {bot_id}"
        )

    if bot.shared_scope != "all":
        raise ValueError(f"Bot {bot_id} is not shared for all users. Cannot publish.")

    if bot.published_api_codebuild_id is not None:
        codebuild_status = find_build_status_by_build_id(bot.published_api_codebuild_id)
        if codebuild_status not in ["SUCCEEDED", "FAILED"]:
            raise ResourceConflictError(
                f"Bot {bot_id} publication is already requested (build id: {bot.published_api_codebuild_id}). Please wait until the previous publication is completed."
            )
        else:
            raise ValueError(
                f"Bot {bot_id} is already published. Please remove the publication before re-publishing."
            )

    # Same value as `bot_id` is used for `public_bot_id`
    published_api_id = bot_id

    environment_variables = {}
    environment_variables["PUBLISHED_API_ID"] = published_api_id

    # Set environment variables.
    if bot_publish_input.throttle.rate_limit is not None:
        environment_variables["PUBLISHED_API_THROTTLE_RATE_LIMIT"] = str(
            bot_publish_input.throttle.rate_limit
        )
    if bot_publish_input.throttle.burst_limit is not None:
        environment_variables["PUBLISHED_API_THROTTLE_BURST_LIMIT"] = str(
            bot_publish_input.throttle.burst_limit
        )
    if bot_publish_input.quota.limit is not None:
        environment_variables["PUBLISHED_API_QUOTA_LIMIT"] = str(
            bot_publish_input.quota.limit
        )
    if bot_publish_input.quota.period is not None:
        environment_variables["PUBLISHED_API_QUOTA_PERIOD"] = str(
            bot_publish_input.quota.period
        )
    if bot_publish_input.stage is not None:
        environment_variables["PUBLISHED_API_DEPLOYMENT_STAGE"] = str(
            bot_publish_input.stage
        )
    if bot_publish_input.allowed_origins is not None:
        environment_variables["PUBLISHED_API_ALLOWED_ORIGINS"] = (
            str(bot_publish_input.allowed_origins).replace(" ", "").replace("'", '"')
        )

    # Create `ApiPublishmentStack` by CodeBuild
    try:
        build_id = start_codebuild_project(environment_variables=environment_variables)
    except Exception as e:
        raise e

    # Update bot attribute
    update_bot_publication(
        user.id, bot_id, published_api_id=published_api_id, build_id=build_id
    )
    return


def fetch_bot_publication(user: User, bot_id: str) -> BotPublishOutput:
    """Get published bot by id."""
    bot = _fetch_bot_with_permission_check(user, bot_id)
    if bot.published_api_codebuild_id is None:
        raise ValueError(f"Bot {bot_id} is not published.")

    codebuild_status = find_build_status_by_build_id(bot.published_api_codebuild_id)
    try:
        stack = find_stack_by_bot_id(bot_id)
    except RecordNotFoundError:
        # Codebuild started but stack creation is not started
        return BotPublishOutput(
            stage="",
            quota=PublishedApiQuota(limit=None, offset=None, period=None),
            throttle=PublishedApiThrottle(rate_limit=None, burst_limit=None),
            allowed_origins=[],
            cfn_status="",
            codebuild_id=bot.published_api_codebuild_id,
            codebuild_status=codebuild_status,
            endpoint="",
            api_key_ids=[],
        )
    if codebuild_status != "SUCCEEDED":
        # Return with cloudformation status
        return BotPublishOutput(
            stage="",
            quota=PublishedApiQuota(limit=None, offset=None, period=None),
            throttle=PublishedApiThrottle(rate_limit=None, burst_limit=None),
            allowed_origins=[],
            cfn_status=stack.stack_status,
            codebuild_id=bot.published_api_codebuild_id,
            codebuild_status=codebuild_status,
            endpoint="",
            api_key_ids=[],
        )

    logger.info(f"Bot {bot_id} is published. Fetching API Gateway information.")

    usage_plan = find_usage_plan_by_id(stack.api_usage_plan_id)  # type: ignore
    return BotPublishOutput(
        stage=stack.api_stage,  # type: ignore
        quota=PublishedApiQuota(
            limit=usage_plan.quota.limit,
            offset=usage_plan.quota.offset,
            period=usage_plan.quota.period,
        ),
        throttle=PublishedApiThrottle(
            rate_limit=usage_plan.throttle.rate_limit,
            burst_limit=usage_plan.throttle.burst_limit,
        ),
        allowed_origins=stack.api_allowed_origins,  # type: ignore
        cfn_status=stack.stack_status,
        codebuild_id=bot.published_api_codebuild_id,
        codebuild_status=codebuild_status,
        endpoint=f"https://{stack.api_id}.execute-api.{REGION}.amazonaws.com/{stack.api_stage}",
        api_key_ids=usage_plan.key_ids,
    )


def remove_bot_publication(user: User, bot_id: str):
    """Remove published bot by id."""
    bot = _fetch_bot_with_permission_check(user, bot_id)

    if bot.published_api_codebuild_id is None:
        raise ValueError(f"Bot {bot_id} is not published.")

    # If Codebuild is not succeeded, just delete bot attribute from DDB and return
    if bot.published_api_codebuild_id is not None:
        codebuild_status = find_build_status_by_build_id(bot.published_api_codebuild_id)
        if codebuild_status not in ["SUCCEEDED", "FAILED"]:
            raise ValueError(
                f"Bot {bot_id} publication is requested (build id: {bot.published_api_codebuild_id}) but not completed. Wait until the publication is completed."
            )

    # Before delete cfn stack, delete all api keys
    try:
        stack = find_stack_by_bot_id(bot_id)
    except RecordNotFoundError:
        delete_bot_publication(bot.owner_user_id, bot_id)
        return

    if stack.stack_status == "CREATE_COMPLETED":
        usage_plan = find_usage_plan_by_id(stack.api_usage_plan_id)  # type: ignore
        for key_id in usage_plan.key_ids:
            delete_api_key(key_id)

    # Delete `ApiPublishmentStack` by CloudFormation
    delete_stack_by_bot_id(bot_id)

    # Delete bot attribute
    delete_bot_publication(bot.owner_user_id, bot_id)
    return


def fetch_api_key(user: User, bot_id: str, api_key: str) -> ApiKeyOutput:
    bot = _fetch_bot_with_permission_check(user, bot_id)

    stack = find_stack_by_bot_id(bot_id)
    assert (
        stack.stack_status == "CREATE_COMPLETE"
    ), f"Bot {bot_id} stack creation is not completed."
    usage_plan = find_usage_plan_by_id(stack.api_usage_plan_id)  # type: ignore

    # Check if the API key is associated with the bot and user
    if api_key not in usage_plan.key_ids:
        raise PermissionError(f"API Key {api_key} is not associated with bot {bot_id}.")

    # Fetch API Key
    key = find_api_key_by_id(api_key, include_value=True)
    return ApiKeyOutput(
        id=key.id,
        value=key.value,
        description=key.description,
        enabled=key.enabled,
        created_date=key.created_date,
    )


def create_new_api_key(
    user: User, bot_id: str, api_key_input: ApiKeyInput
) -> ApiKeyOutput:
    bot = _fetch_bot_with_permission_check(user, bot_id)

    stack = find_stack_by_bot_id(bot_id)
    assert (
        stack.stack_status == "CREATE_COMPLETE"
    ), f"Bot {bot_id} stack creation is not completed."
    usage_plan = find_usage_plan_by_id(stack.api_usage_plan_id)  # type: ignore

    # Create API Key
    key = create_api_key(usage_plan.id, api_key_input.description)
    return ApiKeyOutput(
        id=key.id,
        value="",
        description=key.description,
        enabled=key.enabled,
        created_date=key.created_date,
    )


def remove_api_key(user: User, bot_id: str, api_key_id: str):
    bot = _fetch_bot_with_permission_check(user, bot_id)

    stack = find_stack_by_bot_id(bot_id)
    assert (
        stack.stack_status == "CREATE_COMPLETE"
    ), f"Bot {bot_id} stack creation is not completed."
    usage_plan = find_usage_plan_by_id(stack.api_usage_plan_id)  # type: ignore

    # Check if the API key is associated with the bot and user
    if api_key_id not in usage_plan.key_ids:
        raise PermissionError(
            f"API Key {api_key_id} is not associated with bot {bot_id}."
        )

    # Delete API Key
    delete_api_key(api_key_id)
    return
