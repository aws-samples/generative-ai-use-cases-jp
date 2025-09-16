import base64
import json
import logging
import os
from datetime import datetime
from decimal import Decimal as decimal
from typing import Union

import boto3
from app.config import DEFAULT_GENERATION_CONFIG
from app.repositories.common import (
    TRANSACTION_BATCH_READ_SIZE,
    RecordNotFoundError,
    compose_item_type,
    compose_sk,
    get_bot_table_client,
    get_dynamodb_client,
)
from app.repositories.models.custom_bot import (
    ActiveModelsModel,
    AgentModel,
    BotAliasModel,
    BotMeta,
    BotMetaWithStackInfo,
    BotModel,
    ConversationQuickStarterModel,
    GenerationParamsModel,
    KnowledgeModel,
    UsageStatsModel,
    default_active_models,
)
from app.repositories.models.custom_bot_guardrails import BedrockGuardrailsModel
from app.repositories.models.custom_bot_kb import BedrockKnowledgeBaseModel
from app.routes.schemas.bot import type_shared_scope, type_sync_status
from app.utils import get_current_time
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel("INFO")


class BotNotFoundException(Exception):
    """Exception raised when a bot is not found."""

    pass


class BotUpdateError(Exception):
    """Exception raised when there's an error updating a bot."""

    pass


def store_bot(custom_bot: BotModel):
    table = get_bot_table_client()
    logger.info(f"Storing bot: {custom_bot}")

    item = {
        "PK": custom_bot.owner_user_id,
        "SK": compose_sk(custom_bot.id, "bot"),
        "ItemType": compose_item_type(custom_bot.owner_user_id, "bot"),
        "Title": custom_bot.title,
        "Description": custom_bot.description,
        "Instruction": custom_bot.instruction,
        "CreateTime": decimal(custom_bot.create_time),
        "BotId": custom_bot.id,
        "SharedStatus": custom_bot.shared_status,
        "AllowedCognitoGroups": custom_bot.allowed_cognito_groups,
        "AllowedCognitoUsers": custom_bot.allowed_cognito_users,
        "GenerationParams": custom_bot.generation_params.model_dump(),
        "AgentData": custom_bot.agent.model_dump(),
        "Knowledge": custom_bot.knowledge.model_dump(),
        "PromptCachingEnabled": custom_bot.prompt_caching_enabled,
        "SyncStatus": custom_bot.sync_status,
        "SyncStatusReason": custom_bot.sync_status_reason,
        "LastExecId": custom_bot.sync_last_exec_id,
        "ApiPublishmentStackName": custom_bot.published_api_stack_name,
        "ApiPublishedDatetime": custom_bot.published_api_datetime,
        "ApiPublishCodeBuildId": custom_bot.published_api_codebuild_id,
        "DisplayRetrievedChunks": custom_bot.display_retrieved_chunks,
        "ConversationQuickStarters": [
            starter.model_dump() for starter in custom_bot.conversation_quick_starters
        ],
        "ActiveModels": custom_bot.active_models.model_dump(),  # type: ignore[attr-defined]
        "UsageStats": custom_bot.usage_stats.model_dump(),
    }

    if custom_bot.last_used_time:
        item["LastUsedTime"] = decimal(custom_bot.last_used_time)
    if custom_bot.shared_scope != "private":
        # To use sparse index, set `SharedScope` attribute only when it's not private
        item["SharedScope"] = custom_bot.shared_scope
    if custom_bot.is_starred:
        # To use sparse index, set `IsStarred` attribute only when it's starred
        item["IsStarred"] = "TRUE"
    if custom_bot.bedrock_knowledge_base:
        item["BedrockKnowledgeBase"] = custom_bot.bedrock_knowledge_base.model_dump()
    if custom_bot.bedrock_guardrails:
        item["GuardrailsParams"] = custom_bot.bedrock_guardrails.model_dump()

    response = table.put_item(Item=item)
    logger.info(f"Stored bot: {custom_bot.id} successfully")
    return response


def update_bot(
    owner_user_id: str,
    bot_id: str,
    title: str,
    description: str,
    instruction: str,
    generation_params: GenerationParamsModel,
    agent: AgentModel,
    knowledge: KnowledgeModel,
    prompt_caching_enabled: bool,
    sync_status: type_sync_status,
    sync_status_reason: str,
    display_retrieved_chunks: bool,
    active_models: ActiveModelsModel,  # type: ignore
    conversation_quick_starters: list[ConversationQuickStarterModel],
    bedrock_knowledge_base: BedrockKnowledgeBaseModel | None = None,
    bedrock_guardrails: BedrockGuardrailsModel | None = None,
):
    """Update bot title, description, and instruction.
    NOTE: Use `update_bot_shared_status` to update visibility.
    """
    table = get_bot_table_client()
    logger.info(f"Updating bot: {bot_id}")

    update_expression = (
        "SET Title = :title, "
        "Description = :description, "
        "Instruction = :instruction, "
        "AgentData = :agent_data, "
        "Knowledge = :knowledge, "
        "PromptCachingEnabled = :prompt_caching_enabled, "
        "SyncStatus = :sync_status, "
        "SyncStatusReason = :sync_status_reason, "
        "GenerationParams = :generation_params, "
        "DisplayRetrievedChunks = :display_retrieved_chunks, "
        "ConversationQuickStarters = :conversation_quick_starters, "
        "ActiveModels = :active_models"
    )

    expression_attribute_values = {
        ":title": title,
        ":description": description,
        ":instruction": instruction,
        ":knowledge": knowledge.model_dump(),
        ":agent_data": agent.model_dump(),
        ":prompt_caching_enabled": prompt_caching_enabled,
        ":sync_status": sync_status,
        ":sync_status_reason": sync_status_reason,
        ":display_retrieved_chunks": display_retrieved_chunks,
        ":generation_params": generation_params.model_dump(),
        ":conversation_quick_starters": [
            starter.model_dump() for starter in conversation_quick_starters
        ],
        ":active_models": active_models.model_dump(),  # type: ignore[attr-defined]
    }
    if bedrock_knowledge_base:
        update_expression += ", BedrockKnowledgeBase = :bedrock_knowledge_base"
        expression_attribute_values[":bedrock_knowledge_base"] = (
            bedrock_knowledge_base.model_dump()
        )

    if bedrock_guardrails:
        update_expression += ", GuardrailsParams = :bedrock_guardrails"
        expression_attribute_values[":bedrock_guardrails"] = (
            bedrock_guardrails.model_dump()
        )

    try:
        response = table.update_item(
            Key={"PK": owner_user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW",
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e

    return response


def store_alias(user_id: str, alias: BotAliasModel):
    table = get_bot_table_client()
    logger.info(f"Storing alias: {alias}")

    item = {
        "PK": user_id,
        "SK": compose_sk(alias.original_bot_id, "alias"),
        "ItemType": compose_item_type(user_id, "alias"),
        "OriginalBotId": alias.original_bot_id,
        "OwnerUserId": alias.owner_user_id,
        "IsOriginAccessible": alias.is_origin_accessible,
        "CreateTime": decimal(alias.create_time),
        "LastUsedTime": decimal(alias.last_used_time),
        "Title": alias.title,
        "Description": alias.description,
        "SyncStatus": alias.sync_status,
        "HasKnowledge": alias.has_knowledge,
        "HasAgent": alias.has_agent,
        "ConversationQuickStarters": [
            starter.model_dump() for starter in alias.conversation_quick_starters
        ],
        "ActiveModels": alias.active_models.model_dump(),  # type: ignore[attr-defined]
    }

    if alias.is_starred:
        # To use sparse index, set `IsStarred` attribute only when it's starred
        item["IsStarred"] = "TRUE"

    response = table.put_item(Item=item)
    return response


def update_bot_last_used_time(user_id: str, bot_id: str):
    """Update last used time for bot."""
    table = get_bot_table_client()
    logger.info(f"Updating last used time for bot: {bot_id}")
    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="SET LastUsedTime = :val",
            ExpressionAttributeValues={":val": decimal(get_current_time())},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e
    return response


def update_alias_last_used_time(user_id: str, original_bot_id: str):
    """Update last used time for alias."""
    table = get_bot_table_client()
    logger.info(f"Updating last used time for alias: {original_bot_id}")
    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(original_bot_id, "alias")},
            UpdateExpression="SET LastUsedTime = :val",
            ExpressionAttributeValues={":val": decimal(get_current_time())},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Alias with id {original_bot_id} not found")
        else:
            raise e
    return response


def update_bot_stats(owner_user_id: str, bot_id: str, increment: int):
    """Update usage stats for bot.
    Currently only supports incrementing usage count.
    """
    table = get_bot_table_client()
    logger.info(f"Updating usage stats for bot: {bot_id}")

    try:
        response = table.update_item(
            Key={"PK": owner_user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="SET UsageStats.usage_count = if_not_exists(UsageStats.usage_count, :zero) + :val",
            ExpressionAttributeValues={":zero": 0, ":val": increment},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
        return response
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e


def update_bot_star_status(user_id: str, bot_id: str, starred: bool):
    """Update starred status for bot."""
    table = get_bot_table_client()
    logger.info(f"Updating starred status for bot: {bot_id}")

    key = {"PK": user_id, "SK": compose_sk(bot_id, "bot")}

    if starred:
        response = table.update_item(
            Key=key,
            UpdateExpression="SET IsStarred = :val",
            ExpressionAttributeValues={":val": "TRUE"},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
    else:
        response = table.update_item(
            Key=key,
            UpdateExpression="REMOVE IsStarred",
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )

    logger.info(f"Updated starred status for bot: {bot_id} successfully")
    return response


def update_alias_star_status(user_id: str, original_bot_id: str, starred: bool):
    """Update starred status for alias."""
    table = get_bot_table_client()
    logger.info(f"Updating starred status for alias: {original_bot_id}")

    key = {"PK": user_id, "SK": compose_sk(original_bot_id, "alias")}

    if starred:
        response = table.update_item(
            Key=key,
            UpdateExpression="SET IsStarred = :val",
            ExpressionAttributeValues={":val": "TRUE"},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
    else:
        response = table.update_item(
            Key=key,
            UpdateExpression="REMOVE IsStarred",
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )

    logger.info(f"Updated starred status for alias: {original_bot_id} successfully")
    return response


def update_knowledge_base_id(
    user_id: str, bot_id: str, knowledge_base_id: str, data_source_ids: list[str]
):
    table = get_bot_table_client()
    logger.info(f"Updating knowledge base id for bot: {bot_id}")

    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="SET BedrockKnowledgeBase.knowledge_base_id = :kb_id, BedrockKnowledgeBase.data_source_ids = :ds_ids",
            ExpressionAttributeValues={
                ":kb_id": knowledge_base_id,
                ":ds_ids": data_source_ids,
            },
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
        logger.info(f"Updated knowledge base id for bot: {bot_id} successfully")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e

    return response


def update_guardrails_params(
    user_id: str, bot_id: str, guardrail_arn: str, guardrail_version: str
):
    logger.info("update_guardrails_params")
    table = get_bot_table_client()

    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="SET GuardrailsParams.guardrail_arn = :guardrail_arn, GuardrailsParams.guardrail_version = :guardrail_version",
            ExpressionAttributeValues={
                ":guardrail_arn": guardrail_arn,
                ":guardrail_version": guardrail_version,
            },
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
        logger.info(f"Updated guardrails_arn for bot: {bot_id} successfully")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e

    return response


def update_bot_shared_status(
    owner_user_id: str,
    bot_id: str,
    shared_scope: type_shared_scope,
    shared_status: str,
    allowed_user_ids: list[str],
    allowed_group_ids: list[str],
):
    """Update shared status for bot."""
    table = get_bot_table_client()
    logger.info(f"Updating shared status for bot: {bot_id}")

    update_expression = "SET SharedStatus = :shared_status, AllowedCognitoUsers = :allowed_user_ids, AllowedCognitoGroups = :allowed_group_ids"
    expression_attribute_values = {
        ":shared_status": shared_status,
        ":allowed_user_ids": allowed_user_ids,
        ":allowed_group_ids": allowed_group_ids,
    }

    if shared_scope != "private":
        update_expression += ", SharedScope = :shared_scope"
        expression_attribute_values[":shared_scope"] = shared_scope
    else:
        update_expression += " REMOVE SharedScope"

    try:
        response = table.update_item(
            Key={"PK": owner_user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            ReturnValues="ALL_NEW",
        )
        logger.info(f"Updated shared status for bot: {bot_id} successfully")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e
    return response


def update_alias_is_origin_accessible(
    user_id: str, original_bot_id: str, is_origin_accessible: bool
):
    """Update is_origin_accessible for alias."""
    table = get_bot_table_client()
    logger.info(f"Updating is_origin_accessible for alias: {original_bot_id}")
    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(original_bot_id, "alias")},
            UpdateExpression="SET IsOriginAccessible = :val",
            ExpressionAttributeValues={":val": is_origin_accessible},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Alias with id {original_bot_id} not found")
        else:
            raise e
    return response


def find_owned_bots_by_user_id(user_id: str, limit: int | None = None) -> list[BotMeta]:
    """Find all owned bots by user id.
    The order is descending by `last_used_time`.
    """
    table = get_bot_table_client()
    logger.info(f"Finding bots for user: {user_id}")

    query_params = {
        "IndexName": "ItemTypeIndex",
        "KeyConditionExpression": Key("ItemType").eq(compose_item_type(user_id, "bot")),
        # "ScanIndexForward": False,
    }

    bots: list[BotMeta] = []
    query_count = 0
    MAX_QUERY_COUNT = 5

    while query_count < MAX_QUERY_COUNT:
        query_count += 1
        response = table.query(**query_params)

        bots = [
            BotMeta.from_dynamo_item(item, owned=True, is_origin_accessible=True)
            for item in response["Items"]
        ]

        if limit and len(bots) >= limit:
            break
        if "LastEvaluatedKey" not in response:
            break
        query_params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

    if query_count == MAX_QUERY_COUNT:
        logger.warning("There are more bots than the query limit.")

    if limit:
        bots = bots[:limit]

    # Sort by last used time.
    # NOTE:
    # Sorting approaches in DynamoDB:
    #
    # 1. DynamoDB Sort Key: Using sort key in indexes allows ordered retrieval directly from the database.
    #    - Efficient for large datasets
    #    - Requires the sort key attribute to always exist in items
    #    - Items without the sort key attribute won't appear in the index
    #
    # 2. Application-side sorting: Retrieve all items and sort in application code.
    #    - More flexible handling of missing attributes
    #    - Reasonable performance for smaller datasets (hundreds of items)
    #    - Requires fetching all items before sorting
    #
    # `LastUsedTime` considerations:
    # - Used as sort key in `LastUsedTimeIndex` LSI for recently used bot queries
    # - New bots initially have no `LastUsedTime`, which is problematic when used as GSI sort key
    # - Having newly created bots appear at the top of "recently used" lists is counterintuitive
    #
    # We chose to remove `LastUsedTime` as sort key from ItemTypeIndex because:
    # - Newly created bots should be retrievable but not necessarily treated as "recently used"
    # - Application-side sorting gives more flexibility in handling default values
    # - Performance impact is minimal with expected dataset size (hundreds of bots per user)
    # - Simplifies bot creation by not requiring `LastUsedTime` to be set initially
    bots.sort(key=lambda x: x.last_used_time, reverse=True)

    logger.info(f"Found all owned {len(bots)} bots.")
    return bots


def __find_bots_with_condition(
    query_params: dict,
    max_query_count: int = 5,
) -> list[BotMeta]:
    """Find all bots with the given query parameters.
    Process summary:
    1. Query bots with the given query parameters.
    2. Separate bots and aliases.
    3. Process direct bot items.
    4. Process aliases. Batch get their original bots using DynamoDB client.
    5. If original bot is not found, create a BotMeta object with `is_origin_accessible=False`.
    """
    client = get_dynamodb_client(
        table_type="bot"
    )  # Use DynamoDB client for batch_get_item
    table = get_bot_table_client()
    bots = []
    query_count = 0

    while query_count < max_query_count:
        query_count += 1
        response = table.query(**query_params)

        # Separate bots and aliases
        bot_items = []
        alias_items = []
        for item in response["Items"]:
            if "BOT" in item["ItemType"]:  # Direct bot
                bot_items.append(item)
            else:  # Alias
                alias_items.append(item)

        # Process direct bot items
        for item in bot_items:
            bots.append(
                BotMeta.from_dynamo_item(item, owned=True, is_origin_accessible=True)
            )

        # Process aliases and batch get original bots
        if alias_items:
            original_bot_ids = [item["OriginalBotId"] for item in alias_items]

            for i in range(0, len(original_bot_ids), TRANSACTION_BATCH_READ_SIZE):
                batch_ids = original_bot_ids[i : i + TRANSACTION_BATCH_READ_SIZE]
                batch_aliases = alias_items[i : i + TRANSACTION_BATCH_READ_SIZE]
                request_items = {
                    table.table_name: {
                        "Keys": [
                            {
                                "PK": alias["OwnerUserId"],
                                "SK": compose_sk(bot_id, "bot"),
                            }
                            for alias, bot_id in zip(batch_aliases, batch_ids)
                        ]
                    }
                }
                original_bots_response = client.batch_get_item(
                    RequestItems=request_items
                )

                # Create a map of original bot details
                original_bot_map = {
                    item.get("BotId"): item
                    for item in original_bots_response.get("Responses", {}).get(
                        table.table_name, []
                    )
                }

                # Create BotMeta objects for aliases
                for alias in alias_items[i : i + TRANSACTION_BATCH_READ_SIZE]:
                    original_bot = original_bot_map.get(alias["OriginalBotId"])
                    if original_bot:
                        bots.append(
                            BotMeta.from_dynamo_item(
                                original_bot,
                                owned=False,
                                is_origin_accessible=alias.get(
                                    "IsOriginAccessible", False
                                ),
                                is_starred=alias.get("IsStarred", False),
                            )
                        )
                    else:
                        # If original bot is not found, create a BotMeta object with `is_origin_accessible=False`
                        bots.append(
                            BotMeta.from_dynamo_alias_item(
                                alias,
                                owned=False,
                                is_origin_accessible=False,
                                is_starred=alias.get("IsStarred", False),
                            )
                        )

        if "LastEvaluatedKey" not in response:
            break
        query_params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

    if query_count == max_query_count:
        logger.warning("There are more bots than the query limit.")

    return bots


def find_starred_bots_by_user_id(
    user_id: str, limit: int | None = None
) -> list[BotMeta]:
    """Find all starred bots by user id."""
    logger.info(f"Finding starred bots for user: {user_id}")

    query_params = {
        "IndexName": "StarredIndex",
        "KeyConditionExpression": Key("PK").eq(user_id) & Key("IsStarred").eq("TRUE"),
    }

    bots = __find_bots_with_condition(query_params)

    # Sort bots by last used time
    bots.sort(key=lambda x: x.last_used_time, reverse=True)
    if limit:
        bots = bots[:limit]

    logger.info(f"Found all starred {len(bots)} bots.")
    return bots


def find_recently_used_bots_by_user_id(
    user_id: str, limit: int | None = None
) -> list[BotMeta]:
    """Find all recently used bots by user id."""
    logger.info(f"Finding recently used bots for user: {user_id}")

    query_params = {
        "IndexName": "LastUsedTimeIndex",
        "KeyConditionExpression": Key("PK").eq(user_id),
        "ScanIndexForward": False,
    }

    bots = __find_bots_with_condition(query_params)

    # Sort bots by last used time
    bots.sort(key=lambda x: x.last_used_time, reverse=True)
    if limit:
        bots = bots[:limit]

    logger.info(f"Found all recently used {len(bots)} bots.")
    return bots


def find_bot_by_id(bot_id: str) -> BotModel:
    table = get_bot_table_client()
    logger.info(f"Finding bot with id: {bot_id}")
    response = table.query(
        IndexName="BotIdIndex", KeyConditionExpression=Key("BotId").eq(bot_id)
    )

    if len(response["Items"]) == 0:
        raise RecordNotFoundError(f"Bot with id {bot_id} not found")

    item = response["Items"][0]

    bot = BotModel(
        id=item["BotId"],
        owner_user_id=item["PK"],
        title=item["Title"],
        description=item["Description"],
        instruction=item["Instruction"],
        create_time=float(item["CreateTime"]),
        last_used_time=float(item.get("LastUsedTime", item["CreateTime"])),
        # Note: SharedScope is set to None for private shared_scope to use sparse index
        shared_scope=item.get("SharedScope", "private"),
        shared_status=item["SharedStatus"],
        allowed_cognito_groups=item.get("AllowedCognitoGroups", []),
        allowed_cognito_users=item.get("AllowedCognitoUsers", []),
        # Note: IsStarred is set to False for non-starred bots to use sparse index
        is_starred=item.get("IsStarred", False),
        generation_params=GenerationParamsModel.model_validate(
            {
                **item.get("GenerationParams", DEFAULT_GENERATION_CONFIG),
                # For backward compatibility
                "reasoning_params": item.get("GenerationParams", {}).get(
                    "reasoning_params",
                    {
                        "budget_tokens": DEFAULT_GENERATION_CONFIG["reasoning_params"]["budget_tokens"],  # type: ignore
                    },
                ),
            }
        ),
        agent=(
            AgentModel.model_validate(item["AgentData"])
            if "AgentData" in item
            else AgentModel(tools=[])
        ),
        knowledge=KnowledgeModel(
            **{**item["Knowledge"], "s3_urls": item["Knowledge"].get("s3_urls", [])}
        ),
        prompt_caching_enabled=item.get("PromptCachingEnabled", True),
        sync_status=item["SyncStatus"],
        sync_status_reason=item["SyncStatusReason"],
        sync_last_exec_id=item["LastExecId"],
        published_api_stack_name=item.get("ApiPublishmentStackName", None),
        published_api_datetime=item.get("ApiPublishedDatetime", None),
        published_api_codebuild_id=item.get("ApiPublishCodeBuildId", None),
        display_retrieved_chunks=item.get("DisplayRetrievedChunks", False),
        conversation_quick_starters=item.get("ConversationQuickStarters", []),
        bedrock_knowledge_base=(
            BedrockKnowledgeBaseModel(
                **{
                    **item["BedrockKnowledgeBase"],
                    "chunking_configuration": item["BedrockKnowledgeBase"].get(
                        "chunking_configuration", None
                    ),
                    "parsing_model": item["BedrockKnowledgeBase"].get(
                        "parsing_model", "disabled"
                    ),
                }
            )
            if "BedrockKnowledgeBase" in item
            else None
        ),
        bedrock_guardrails=(
            BedrockGuardrailsModel(**item["GuardrailsParams"])
            if "GuardrailsParams" in item
            else None
        ),
        active_models=(
            ActiveModelsModel.model_validate(item.get("ActiveModels"))
            if item.get("ActiveModels")
            else default_active_models  # for backward compatibility
        ),
        usage_stats=(
            UsageStatsModel.model_validate(item.get("UsageStats"))
            if item.get("UsageStats")
            else UsageStatsModel(usage_count=0)  # for backward compatibility
        ),
    )

    logger.info(f"Found bot: {bot}")
    return bot


def find_pinned_public_bots() -> list[BotMeta]:
    """Find all pinned bots."""
    table = get_bot_table_client()
    logger.info("Finding pinned bots")

    response = table.query(
        IndexName="SharedScopeIndex",
        KeyConditionExpression=Key("SharedScope").eq("all")
        & Key("SharedStatus").begins_with("pinned"),
    )

    bots = [
        # Note: pinned bot should not be editable directly, so `owned=False`
        BotMeta.from_dynamo_item(item, owned=False, is_origin_accessible=True)
        for item in response["Items"]
    ]

    logger.info(f"Found all pinned {len(bots)} bots.")
    return bots


def alias_exists(user_id: str, bot_id: str) -> bool:
    """Check if alias bot exists by id."""
    table = get_bot_table_client()
    logger.info(f"Checking if alias bot exists with id: {bot_id} for user: {user_id}")

    try:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(user_id)
            & Key("SK").eq(compose_sk(bot_id, "alias"))
        )
        return len(response.get("Items", [])) > 0
    except ClientError as e:
        logger.error(f"Error while checking alias existence: {e}")
        return False


def update_bot_publication(
    owner_user_id: str, bot_id: str, published_api_id: str, build_id: str
):
    table = get_bot_table_client()
    current_time = get_current_time()  # epoch time (int) を取得
    logger.info(f"Updating bot publication: {bot_id}")
    try:
        response = table.update_item(
            Key={"PK": owner_user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="SET ApiPublishmentStackName = :val, ApiPublishedDatetime = :time, ApiPublishCodeBuildId = :build_id",
            # NOTE: Stack naming rule: ApiPublishmentStack{published_api_id}.
            # See bedrock-chat-stack.ts > `ApiPublishmentStack`
            ExpressionAttributeValues={
                ":val": f"ApiPublishmentStack{published_api_id}",
                ":time": current_time,
                ":build_id": build_id,
            },
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e

    return response


def delete_bot_publication(owner_user_id: str, bot_id: str):
    table = get_bot_table_client()
    logger.info(f"Deleting bot publication: {bot_id}")
    try:
        response = table.update_item(
            Key={"PK": owner_user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="REMOVE ApiPublishmentStackName, ApiPublishedDatetime, ApiPublishCodeBuildId",
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e

    return response


def delete_bot_by_id(owner_user_id: str, bot_id: str):
    table = get_bot_table_client()
    logger.info(f"Deleting bot with id: {bot_id}")

    try:
        response = table.delete_item(
            Key={"PK": owner_user_id, "SK": compose_sk(bot_id, "bot")},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e

    return response


def delete_alias_by_id(user_id: str, bot_id: str):
    table = get_bot_table_client()
    logger.info(f"Deleting alias with id: {bot_id}")

    try:
        response = table.delete_item(
            Key={"PK": user_id, "SK": compose_sk(bot_id, "alias")},
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot alias with id {bot_id} not found")
        else:
            raise e

    return response


def remove_bot_last_used_time(user_id: str, bot_id: str):
    """Remove last used time for bot to exclude it from recently used bots."""
    table = get_bot_table_client()
    logger.info(f"Removing last used time for bot: {bot_id}")
    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(bot_id, "bot")},
            UpdateExpression="REMOVE LastUsedTime",
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Bot with id {bot_id} not found")
        else:
            raise e
    return response


def remove_alias_last_used_time(user_id: str, original_bot_id: str):
    """Remove last used time for alias to exclude it from recently used bots."""
    table = get_bot_table_client()
    logger.info(f"Removing last used time for alias: {original_bot_id}")
    try:
        response = table.update_item(
            Key={"PK": user_id, "SK": compose_sk(original_bot_id, "alias")},
            UpdateExpression="REMOVE LastUsedTime",
            ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise RecordNotFoundError(f"Alias with id {original_bot_id} not found")
        else:
            raise e
    return response


def find_alias_by_bot_id(user_id: str, original_bot_id: str) -> BotAliasModel:
    """Find an alias by its original bot ID for a specific user.

    Args:
        user_id: The ID of the user who owns the alias
        original_bot_id: The ID of the original bot

    Returns:
        BotAliasModel: The alias model

    Raises:
        RecordNotFoundError: If the alias is not found
    """
    table = get_bot_table_client()
    logger.info(
        f"Finding alias with original bot id: {original_bot_id} for user: {user_id}"
    )

    response = table.query(
        KeyConditionExpression=Key("PK").eq(user_id)
        & Key("SK").eq(compose_sk(original_bot_id, "alias"))
    )

    if len(response["Items"]) == 0:
        raise RecordNotFoundError(
            f"Alias for bot with id {original_bot_id} not found for user {user_id}"
        )

    item = response["Items"][0]
    return BotAliasModel.from_dynamo_item(item)


def find_all_published_bots(
    limit: int = 1000, next_token: str | None = None
) -> tuple[list[BotMetaWithStackInfo], str | None]:
    table = get_bot_table_client()
    query_params = {
        "IndexName": "SharedScopeIndex",
        "KeyConditionExpression": Key("SharedScope").eq("all"),
        "FilterExpression": Attr("ApiPublishmentStackName").exists()
        & Attr("ApiPublishmentStackName").ne(None),
        "Limit": limit,
    }
    if next_token:
        query_params["ExclusiveStartKey"] = json.loads(
            base64.b64decode(next_token).decode("utf-8")
        )

    response = table.query(**query_params)

    bots = [
        BotMetaWithStackInfo(
            id=item["BotId"],
            title=item["Title"],
            description=item["Description"],
            create_time=float(item["CreateTime"]),
            last_used_time=float(item.get("LastUsedTime", item["CreateTime"])),
            sync_status=item["SyncStatus"],
            owner_user_id=item["PK"],
            published_api_stack_name=item.get("ApiPublishmentStackName", None),
            published_api_datetime=item.get("ApiPublishedDatetime", None),
            shared_scope=item.get("SharedScope", "private"),
            shared_status=item.get("SharedStatus"),
        )
        for item in response["Items"]
    ]

    next_token = None
    if "LastEvaluatedKey" in response:
        next_token = base64.b64encode(
            json.dumps(response["LastEvaluatedKey"]).encode("utf-8")
        ).decode("utf-8")

    return bots, next_token
