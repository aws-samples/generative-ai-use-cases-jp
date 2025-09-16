import os
from typing import Any, Dict, List, TypedDict

import boto3
from app.repositories.common import decompose_sk

BEDROCK_REGION = os.environ.get("BEDROCK_REGION")

cf_client = boto3.client("cloudformation", BEDROCK_REGION)


class StackItem(TypedDict):
    KnowledgeBaseId: str
    DataSourceId: str
    GuardrailArn: str
    GuardrailVersion: str
    PK: str
    SK: str


class StackResult(TypedDict):
    KnowledgeBaseId: str
    items: List[StackItem]


def handler(event: Dict[str, str], context: Any) -> StackResult:
    print(event)
    pk = event["pk"]
    sk = event["sk"]

    bot_id = decompose_sk(sk)

    # Note: stack naming rule is defined on:
    # cdk/bin/bedrock-knowledge-base.ts
    stack_name = f"BrChatKbStack{bot_id}"

    response = cf_client.describe_stacks(StackName=stack_name)
    outputs = response["Stacks"][0]["Outputs"]

    knowledge_base_id = None
    data_source_ids: List[str] = []
    guardrail_arn = None
    guardrail_version = None
    result: StackResult = {"KnowledgeBaseId": "", "items": []}

    for output in outputs:
        if output["OutputKey"] == "KnowledgeBaseId":
            knowledge_base_id = output["OutputValue"]
            result["KnowledgeBaseId"] = knowledge_base_id
        elif output["OutputKey"].startswith("DataSource"):
            data_source_ids.append(output["OutputValue"])
        elif output["OutputKey"] == "GuardrailArn":
            guardrail_arn = output["OutputValue"]
        elif output["OutputKey"] == "GuardrailVersion":
            guardrail_version = output["OutputValue"]

    for data_source_id in data_source_ids:
        result["items"].append(
            {
                "KnowledgeBaseId": knowledge_base_id or "",
                "DataSourceId": data_source_id,
                "GuardrailArn": guardrail_arn if guardrail_arn is not None else "",
                "GuardrailVersion": (
                    guardrail_version if guardrail_version is not None else ""
                ),
                "PK": pk,
                "SK": sk,
            }
        )

    return result
