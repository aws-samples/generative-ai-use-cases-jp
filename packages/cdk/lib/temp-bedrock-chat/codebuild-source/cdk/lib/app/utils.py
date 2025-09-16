import json
import logging
import os
from datetime import datetime
from typing import Any, Literal

import boto3
from app.repositories.models.custom_bot_guardrails import BedrockGuardrailsModel
from app.user import User
from botocore.client import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

REGION = os.environ.get("REGION", "us-east-1")
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
ENV_NAME = os.environ.get("ENV_NAME", "default")

logger.debug(f"REGION: {REGION}")
logger.debug(f"BEDROCK_REGION: {BEDROCK_REGION}")
logger.debug(f"ENV_NAME: {ENV_NAME}")

PUBLISH_API_CODEBUILD_PROJECT_NAME = os.environ.get(
    "PUBLISH_API_CODEBUILD_PROJECT_NAME", ""
)
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")


def snake_to_camel(snake_str):
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def is_running_on_lambda():
    return "AWS_EXECUTION_ENV" in os.environ


def get_bedrock_client(region=BEDROCK_REGION):
    client = boto3.client("bedrock", region_name=region)
    return client


def get_bedrock_runtime_client(region=BEDROCK_REGION):
    client = boto3.client("bedrock-runtime", region_name=region)
    return client


def get_bedrock_agent_client(region=BEDROCK_REGION):
    client = boto3.client("bedrock-agent", region_name=region)
    return client


def get_bedrock_agent_runtime_client(region=BEDROCK_REGION):
    client = boto3.client("bedrock-agent-runtime", region_name=region)
    return client


def get_current_time():
    # Get current time as milliseconds epoch time
    return int(datetime.now().timestamp() * 1000)


def generate_presigned_url(
    bucket: str,
    key: str,
    content_type: str | None = None,
    expiration=3600,
    client_method: Literal["put_object", "get_object"] = "put_object",
) -> str:
    # See: https://github.com/boto/boto3/issues/421#issuecomment-1849066655
    client = boto3.client(
        "s3",
        region_name=BEDROCK_REGION,
        config=Config(signature_version="v4", s3={"addressing_style": "path"}),
    )
    params = {"Bucket": bucket, "Key": key}
    if content_type:
        params["ContentType"] = content_type
    response = client.generate_presigned_url(
        ClientMethod=client_method,
        Params=params,
        ExpiresIn=expiration,
        HttpMethod="PUT" if client_method == "put_object" else "GET",
    )

    return response


def compose_upload_temp_s3_prefix(user_id: str, bot_id: str) -> str:
    return f"{user_id}/{bot_id}/_temp/"


def compose_upload_temp_s3_path(user_id: str, bot_id: str, filename: str) -> str:
    """Compose S3 path for temporary files.
    This path is used for uploading files to S3.
    """
    prefix = compose_upload_temp_s3_prefix
    return f"{prefix(user_id, bot_id)}{filename}"


def compose_upload_document_s3_path(user_id: str, bot_id: str, filename: str) -> str:
    """Compose S3 path for documents.
    The files on this path is used for embedding.
    """
    return f"{user_id}/{bot_id}/documents/{filename}"


def delete_file_from_s3(bucket: str, key: str, ignore_not_exist: bool = False):
    client = boto3.client("s3", region_name=BEDROCK_REGION)

    # Check if the file exists
    if not ignore_not_exist:
        try:
            client.head_object(Bucket=bucket, Key=key)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                raise FileNotFoundError(f"The file does not exist in bucket.")
            else:
                raise

    response = client.delete_object(Bucket=bucket, Key=key)
    return response


def delete_files_with_prefix_from_s3(bucket: str, prefix: str):
    """Delete all objects with the given prefix from the given bucket."""
    client = boto3.client("s3", region_name=BEDROCK_REGION)
    response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)

    if "Contents" not in response:
        return

    for obj in response["Contents"]:
        client.delete_object(Bucket=bucket, Key=obj["Key"])


def check_if_file_exists_in_s3(bucket: str, key: str):
    client = boto3.client("s3", region_name=BEDROCK_REGION)

    # Check if the file exists
    try:
        client.head_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return False
        else:
            raise

    return True


def move_file_in_s3(bucket: str, key: str, new_key: str):
    client = boto3.client("s3", region_name=BEDROCK_REGION)

    # Check if the file exists
    try:
        client.head_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            raise FileNotFoundError(f"The file does not exist in bucket.")
        else:
            raise

    response = client.copy_object(
        Bucket=bucket, Key=new_key, CopySource={"Bucket": bucket, "Key": key}
    )
    response = client.delete_object(Bucket=bucket, Key=key)
    return response


def start_codebuild_project(environment_variables: dict) -> str:
    environment_variables_override = [
        {"name": key, "value": value} for key, value in environment_variables.items()
    ]
    client = boto3.client("codebuild")
    response = client.start_build(
        projectName=PUBLISH_API_CODEBUILD_PROJECT_NAME,
        environmentVariablesOverride=environment_variables_override,
    )
    return response["build"]["id"]


def get_user_cognito_groups(user: User, user_pool_id: str = USER_POOL_ID) -> list[str]:
    """Retrieve the groups that a Cognito user belongs to."""
    client = boto3.client("cognito-idp")

    try:
        response = client.admin_list_groups_for_user(
            UserPoolId=user_pool_id, Username=user.email
        )
        groups = [group["GroupName"] for group in response.get("Groups", [])]
        logger.info(f"Groups for user {user.name}: {groups}")

        return groups

    except ClientError as e:
        print(f"Error retrieving groups for user {user.name}: {e}")
        return []


def store_api_key_to_secret_manager(
    user_id: str, bot_id: str, prefix: str, api_key: str
) -> str:
    """Store API key in Secrets Manager.

    Args:
        user_id: User ID
        bot_id: Bot ID
        prefix: Prefix
        api_key: API key

    Returns:
        str: Secret ARN

    Raises:
        ClientError: If there is an error with Secrets Manager
    """
    secret_name = f"{prefix}/{user_id}/{bot_id}"
    secret_value = json.dumps({"api_key": api_key})

    try:
        secrets_client = boto3.client("secretsmanager")
        logger.info(f"Attempting to store API key for {secret_name}")

        try:
            # Try to get existing secret
            existing_secret = secrets_client.describe_secret(SecretId=secret_name)
            logger.info(f"Found existing secret: {secret_name}")

            # Update existing secret
            response = secrets_client.update_secret(
                SecretId=secret_name, SecretString=secret_value
            )
            logger.info(f"Updated existing secret: {secret_name}")
            return response["ARN"]

        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                # Create new secret if it doesn't exist
                logger.info(f"Creating new secret: {secret_name}")
                response = secrets_client.create_secret(
                    Name=secret_name,
                    SecretString=secret_value,
                    Tags=[{"Key": "CDKEnvironment", "Value": ENV_NAME}],
                )
                logger.info(f"Created new secret: {secret_name}")
                return response["ARN"]
            else:
                logger.error(f"Error accessing secret {secret_name}: {e}")
                raise

    except ClientError as e:
        logger.error(f"Error storing API key: {e}")
        raise


def get_api_key_from_secret_manager(secret_arn: str) -> str:
    """Get API key from Secrets Manager.

    Args:
        secret_arn: Secret ARN

    Returns:
        str: API key

    Raises:
        ClientError: If there is an error with Secrets Manager
    """
    try:
        secrets_client = boto3.client("secretsmanager")
        response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret = json.loads(response["SecretString"])
        return secret["api_key"]
    except ClientError as e:
        logger.error(f"Error getting API key: {e}")
        raise


def delete_api_key_from_secret_manager(user_id: str, bot_id: str, prefix: str) -> None:
    """Delete API key from Secrets Manager.

    Args:
        user_id: User ID
        bot_id: Bot ID

    Raises:
        ClientError: If there is an error with Secrets Manager
    """
    secret_name = f"{prefix}/{user_id}/{bot_id}"

    try:
        secrets_client = boto3.client("secretsmanager")
        logger.info(f"Attempting to delete API key for {secret_name}")

        try:
            # Delete secret
            secrets_client.delete_secret(
                SecretId=secret_name, ForceDeleteWithoutRecovery=True
            )
            logger.info(f"Deleted secret: {secret_name}")

        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                # Secret doesn't exist, ignore
                logger.info(f"Secret {secret_name} not found, skipping deletion")
                return
            else:
                logger.error(f"Error deleting secret {secret_name}: {e}")
                raise

    except ClientError as e:
        logger.error(f"Error accessing Secrets Manager: {e}")
        raise
