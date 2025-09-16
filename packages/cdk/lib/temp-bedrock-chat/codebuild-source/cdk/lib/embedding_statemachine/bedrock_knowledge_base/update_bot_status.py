import json
import logging
import os
from typing import Literal

import boto3
from app.repositories.common import compose_sk, decompose_sk, get_bot_table_client
from app.routes.schemas.bot import type_sync_status
from reretry import retry

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

RETRIES_TO_UPDATE_SYNC_STATUS = 4
RETRY_DELAY_TO_UPDATE_SYNC_STATUS = 2


@retry(tries=RETRIES_TO_UPDATE_SYNC_STATUS, delay=RETRY_DELAY_TO_UPDATE_SYNC_STATUS)
def update_sync_status(
    user_id: str,
    bot_id: str,
    sync_status: type_sync_status,
    sync_status_reason: str,
    last_exec_id: str,
):
    table = get_bot_table_client()
    table.update_item(
        Key={"PK": user_id, "SK": compose_sk(bot_id, "bot")},
        UpdateExpression="SET SyncStatus = :sync_status, SyncStatusReason = :sync_status_reason, LastExecId = :last_exec_id",
        ExpressionAttributeValues={
            ":sync_status": sync_status,
            ":sync_status_reason": sync_status_reason,
            ":last_exec_id": last_exec_id,
        },
    )


def extract_from_cause(cause_str: str) -> tuple:
    logger.debug(f"Extracting PK and SK from cause: {cause_str}")
    cause = json.loads(cause_str)
    logger.debug(f"Cause: {cause}")
    environment_variables = cause["Build"]["Environment"]["EnvironmentVariables"]
    logger.debug(f"Environment variables: {environment_variables}")

    pk = next(
        (item["Value"] for item in environment_variables if item["Name"] == "PK"), None
    )
    sk = next(
        (item["Value"] for item in environment_variables if item["Name"] == "SK"), None
    )

    if not pk or not sk:
        raise ValueError("PK or SK not found in cause.")

    build_arn = cause["Build"].get("Arn", "")

    logger.debug(f"PK: {pk}, SK: {sk}, Build ARN: {build_arn}")

    return pk, sk, build_arn


def handler(event, context):
    logger.info(f"Event: {event}")
    try:
        cause = event.get("cause", None)
        ingestion_job = event.get("ingestion_job", None)

        # Initialize variables
        pk: str
        sk: str
        sync_status: type_sync_status
        sync_status_reason: str
        last_exec_id: str

        if cause:
            # UpdateSymcStatusFailed
            pk, sk, build_arn = extract_from_cause(cause)
            sync_status = "FAILED"
            sync_status_reason = cause
            last_exec_id = build_arn
        elif ingestion_job:
            # UpdateSymcStatusFailedForIngestion
            pk = event["pk"]
            sk = event["sk"]
            sync_status = "FAILED"
            sync_status_reason = str(ingestion_job["ingestionJob"]["failureReasons"])
            last_exec_id = ingestion_job["ingestionJob"]["ingestionJobId"]
        else:
            pk = event["pk"]
            sk = event["sk"]
            sync_status = event["sync_status"]
            sync_status_reason = event.get("sync_status_reason", "")
            last_exec_id = event.get("last_exec_id", "")

        user_id = pk
        bot_id = decompose_sk(sk)

        logger.info(
            f"Updating sync status for bot {bot_id} of user {user_id} to {sync_status} with reason: {sync_status_reason}"
        )

        update_sync_status(
            user_id, bot_id, sync_status, sync_status_reason, last_exec_id
        )

        return {
            "statusCode": 200,
            "body": json.dumps("Sync status updated successfully."),
        }
    except Exception as e:
        logger.error(f"Error updating sync status: {e}")
        return {"statusCode": 500, "body": json.dumps("Error updating sync status.")}
