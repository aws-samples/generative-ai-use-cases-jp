import json
import os
from typing import Literal

import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

DDB_ENDPOINT_URL = os.environ.get("DDB_ENDPOINT_URL")
CONVERSATION_TABLE_NAME = os.environ.get("CONVERSATION_TABLE_NAME", "")
BOT_TABLE_NAME = os.environ.get("BOT_TABLE_NAME", "")
ACCOUNT = os.environ.get("ACCOUNT", "")
REGION = os.environ.get("REGION", "ap-northeast-1")
TABLE_ACCESS_ROLE_ARN = os.environ.get("TABLE_ACCESS_ROLE_ARN", "")

OPENSEARCH_DOMAIN_ENDPOINT = os.environ.get(
    "OPENSEARCH_DOMAIN_ENDPOINT",
)

# DynamoDB batch operation limits
# Ref: https://docs.aws.amazon.com/en_en/amazondynamodb/latest/developerguide/read-write-operations.html
TRANSACTION_BATCH_WRITE_SIZE = 25
TRANSACTION_BATCH_READ_SIZE = 100

type_table = Literal["conversation", "bot"]
_table_name_map = {"conversation": CONVERSATION_TABLE_NAME, "bot": BOT_TABLE_NAME}


class RecordNotFoundError(Exception):
    pass


class RecordAccessNotAllowedError(Exception):
    pass


class ResourceConflictError(Exception):
    pass


def compose_conv_id(user_id: str, conversation_id: str):
    # Add user_id prefix for row level security to match with `LeadingKeys` condition
    import logging
    logger = logging.getLogger(__name__)
    result = f"{user_id}#CONV#{conversation_id}"
    logger.info(f"[compose_conv_id] user_id={user_id}, conversation_id={conversation_id} -> {result}")
    return result


def decompose_conv_id(conv_id: str):
    return conv_id.split("#")[-1]


def compose_related_document_source_id(
    user_id: str,
    conversation_id: str,
    source_id: str,
):
    # Add user_id prefix for row level security to match with `LeadingKeys` condition
    return f"{user_id}#RELATED_DOCUMENT#{conversation_id}#{source_id}"


def decompose_related_document_source_id(composed_id: str):
    return composed_id.split("#")[-1]


def compose_item_type(user_id: str, item_type: Literal["bot", "alias"]):
    if item_type == "bot":
        return f"{user_id}#BOT"
    elif item_type == "alias":
        return f"{user_id}#ALIAS"


def compose_sk(bot_id: str, item_type: Literal["bot", "alias"]):
    if item_type == "bot":
        return f"BOT#{bot_id}"
    elif item_type == "alias":
        return f"ALIAS#{bot_id}"


def decompose_sk(sk: str):
    """Decompose sort key to get bot_id."""
    return sk.split("#")[-1]


def _get_aws_resource(service_name, table_name: str, user_id: str | None = None):
    """Get AWS resource with optional row-level access control for DynamoDB.
    Ref: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_dynamodb_items.html
    """
    if "AWS_EXECUTION_ENV" not in os.environ:
        if DDB_ENDPOINT_URL:
            return boto3.resource(
                service_name,
                endpoint_url=DDB_ENDPOINT_URL,
                aws_access_key_id="key",
                aws_secret_access_key="key",
                region_name=REGION,
            )  # type: ignore[call-overload]
        else:
            return boto3.resource(service_name, region_name=REGION)  # type: ignore[call-overload]

    policy_document: dict[str, list[dict]] = {
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:ConditionCheckItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:DescribeTable",
                    "dynamodb:GetItem",
                    "dynamodb:GetRecords",
                    "dynamodb:PutItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "dynamodb:UpdateItem",
                ],
                "Resource": [
                    f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/{table_name}",
                    f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/{table_name}/index/*",
                ],
            }
        ]
    }

    if user_id:
        policy_document["Statement"][0]["Condition"] = {  # type: ignore[assignment]
            # Allow access to items with the same partition key as the user id
            "ForAllValues:StringLike": {"dynamodb:LeadingKeys": [f"{user_id}*"]}
        }

    sts_client = boto3.client("sts")
    assumed_role_object = sts_client.assume_role(
        RoleArn=TABLE_ACCESS_ROLE_ARN,
        RoleSessionName="DynamoDBSession",
        Policy=json.dumps(policy_document),
    )
    credentials = assumed_role_object["Credentials"]
    session = boto3.Session(
        aws_access_key_id=credentials["AccessKeyId"],
        aws_secret_access_key=credentials["SecretAccessKey"],
        aws_session_token=credentials["SessionToken"],
    )
    return session.resource(service_name, region_name=REGION)  # type: ignore[call-overload]


def get_dynamodb_client(user_id=None, table_type: type_table = "conversation"):
    """Get a DynamoDB client, optionally with row-level access control."""
    return _get_aws_resource(
        "dynamodb", user_id=user_id, table_name=_table_name_map[table_type]
    ).meta.client


def get_conversation_table_client(user_id: str):
    """Get a DynamoDB table client for conversation table."""
    return _get_aws_resource(
        "dynamodb", user_id=user_id, table_name=CONVERSATION_TABLE_NAME
    ).Table(CONVERSATION_TABLE_NAME)


def get_conversation_table_public_client():
    """Get a DynamoDB table client for conversation table.
    Warning: No row-level access. Use for only limited use case.
    """
    return _get_aws_resource("dynamodb", table_name=CONVERSATION_TABLE_NAME).Table(
        CONVERSATION_TABLE_NAME
    )


def get_bot_table_client():
    """Get a DynamoDB table client for bot table.
    Note: Bot table does not have row-level access control.
    """
    return _get_aws_resource("dynamodb", table_name=BOT_TABLE_NAME).Table(
        BOT_TABLE_NAME
    )


def get_opensearch_client(collection_type: str = "bot") -> OpenSearch:
    """Get OpenSearch client with AWS authentication.

    Args:
        collection_type: Type of collection to connect to ("bot" or "conversation")
        Note: This method now uses a single shared endpoint for both bot and conversation collections
    """
    endpoint = OPENSEARCH_DOMAIN_ENDPOINT
    if not endpoint:
        raise ValueError("OPENSEARCH_DOMAIN_ENDPOINT is not set")

    # Get credentials from boto3
    credentials = boto3.Session().get_credentials()
    assert credentials is not None, "Credentials are not available"
    aws_auth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        REGION,
        "aoss",
        session_token=credentials.token,
    )

    # Omit https
    host = endpoint.replace("https://", "")

    client = OpenSearch(
        hosts=[{"host": host, "port": 443}],
        http_auth=aws_auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=30,
    )

    return client
