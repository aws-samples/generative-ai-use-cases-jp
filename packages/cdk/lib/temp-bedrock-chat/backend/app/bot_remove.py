import os
from typing import Any

import boto3
from app.repositories.api_publication import (
    delete_api_key,
    delete_stack_by_bot_id,
    find_stack_by_bot_id,
    find_usage_plan_by_id,
)
from app.repositories.common import RecordNotFoundError, decompose_sk
from app.utils import delete_api_key_from_secret_manager

DOCUMENT_BUCKET = os.environ.get("DOCUMENT_BUCKET", "documents")
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")

s3_client = boto3.client("s3", BEDROCK_REGION)


def delete_custom_bot_stack_by_bot_id(bot_id: str):
    client = boto3.client("cloudformation", BEDROCK_REGION)
    stack_name = f"BrChatKbStack{bot_id}"
    try:
        response = client.delete_stack(StackName=stack_name)
    except client.exceptions.ClientError:
        raise RecordNotFoundError()
    return response


def delete_from_s3(user_id: str, bot_id: str):
    """Delete all files in S3 bucket for the specified `user_id` and `bot_id`."""
    prefix = f"{user_id}/{bot_id}/"
    try:
        # List all objects with the specific prefix
        objects_to_delete = s3_client.list_objects_v2(
            Bucket=DOCUMENT_BUCKET, Prefix=prefix
        )
        if "Contents" in objects_to_delete:
            # Prepare the list of objects to delete
            delete_keys = [{"Key": obj["Key"]} for obj in objects_to_delete["Contents"]]
            # Delete the objects
            s3_client.delete_objects(
                Bucket=DOCUMENT_BUCKET, Delete={"Objects": delete_keys}
            )
            print(f"Successfully deleted files from S3 for bot_id: {bot_id}")
        else:
            print("No files found to delete in S3.")
    except Exception as e:
        print(f"Error deleting files for bot_id: {bot_id}")
        print(e)


def handler(event: dict, context: Any) -> None:
    """Bot removal handler.
    This function is triggered by dynamodb stream when item is deleted.
    Following resources are deleted asynchronously when bot is deleted:
    - vector store record (postgres)
    - s3 files
    - cloudformation stack (if exists)
    """

    print(f"Received event: {event}")

    # NOTE: batch size is 1
    record = event["Records"][0]

    pk = record["dynamodb"]["Keys"]["PK"]["S"]
    sk = record["dynamodb"]["Keys"].get("SK", {}).get("S")
    if not sk or "BOT#" not in sk:
        # Ignore non-bot items
        print(f"Skipping event for SK: {sk}")
        return

    user_id = pk
    bot_id = decompose_sk(sk)

    delete_from_s3(user_id, bot_id)
    delete_custom_bot_stack_by_bot_id(bot_id)
    delete_api_key_from_secret_manager(user_id, bot_id, "firecrawl")

    # Check if api published stack exists
    try:
        stack = find_stack_by_bot_id(bot_id)
    except RecordNotFoundError:
        print(f"Bot {bot_id} api published stack not found. Skipping deletion.")
        return

    # Before delete cfn stack, delete all api keys
    if stack.api_usage_plan_id:  # Add type check
        usage_plan = find_usage_plan_by_id(stack.api_usage_plan_id)
        for key_id in usage_plan.key_ids:
            delete_api_key(key_id)

    # Delete `ApiPublishmentStack` by CloudFormation
    delete_stack_by_bot_id(bot_id)
