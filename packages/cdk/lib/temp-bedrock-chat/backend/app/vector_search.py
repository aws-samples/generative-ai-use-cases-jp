import logging
from typing import TypedDict, Any
from urllib.parse import urlparse

from app.repositories.models.conversation import (
    RelatedDocumentModel,
    TextToolResultModel,
)
from app.repositories.models.custom_bot import BotModel
from app.repositories.knowledge_base import get_knowledge_base_info
from app.utils import get_bedrock_agent_runtime_client
from botocore.exceptions import ClientError
from mypy_boto3_bedrock_agent_runtime.type_defs import (
    KnowledgeBaseRetrievalResultTypeDef,
    KnowledgeBaseVectorSearchConfigurationTypeDef,
    RetrieveRequestTypeDef,
)
from mypy_boto3_bedrock_agent_runtime.literals import (
    SearchTypeType,
)
from mypy_boto3_bedrock_runtime.type_defs import GuardrailConverseContentBlockTypeDef


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
agent_client = get_bedrock_agent_runtime_client()


class SearchResult(TypedDict):
    bot_id: str
    content: str
    source_name: str
    source_link: str
    rank: int
    metadata: dict[str, Any]
    page_number: int | None


def search_result_to_related_document(
    search_result: SearchResult,
    source_id_base: str,
) -> RelatedDocumentModel:
    return RelatedDocumentModel(
        content=TextToolResultModel(
            text=search_result["content"],
        ),
        source_id=f"{source_id_base}@{search_result['rank']}",
        source_name=search_result["source_name"],
        source_link=search_result["source_link"],
        page_number=search_result["page_number"],
    )


def to_guardrails_grounding_source(
    search_results: list[SearchResult],
) -> GuardrailConverseContentBlockTypeDef | None:
    """Convert search results to Guardrails Grounding source format."""
    return (
        {
            "text": {
                "text": "\n\n".join(x["content"] for x in search_results),
                "qualifiers": ["grounding_source"],
            }
        }
        if len(search_results) > 0
        else None
    )


def _bedrock_knowledge_base_search(bot: BotModel, query: str) -> list[SearchResult]:
    assert bot.bedrock_knowledge_base is not None
    assert (
        bot.bedrock_knowledge_base.knowledge_base_id is not None
        or bot.bedrock_knowledge_base.exist_knowledge_base_id is not None
    ), "Either knowledge_base_id or exist_knowledge_base_id must be set"

    search_type: SearchTypeType
    if bot.bedrock_knowledge_base.search_params.search_type == "semantic":
        search_type = "SEMANTIC"
    elif bot.bedrock_knowledge_base.search_params.search_type == "hybrid":
        search_type = "HYBRID"
    else:
        raise ValueError("Invalid search type")

    limit = bot.bedrock_knowledge_base.search_params.max_results
    # Use exist_knowledge_base_id if available, otherwise use knowledge_base_id
    knowledge_base_id = (
        bot.bedrock_knowledge_base.exist_knowledge_base_id
        if bot.bedrock_knowledge_base.exist_knowledge_base_id is not None
        else bot.bedrock_knowledge_base.knowledge_base_id
    )
    assert knowledge_base_id is not None, "knowledge_base_id must be set"

    try:
        # Init retrieve parameter
        retrieve_parameter: RetrieveRequestTypeDef = {
            "knowledgeBaseId": knowledge_base_id,
            "retrievalQuery": {"text": query},
            "retrievalConfiguration": {
                "vectorSearchConfiguration": {
                    "numberOfResults": limit,
                    "overrideSearchType": search_type,
                }
            },
        }

        # Omit overrideSearchType parameter if needed
        def omit_override_search_type_parameter(
            retrieve_parameter: RetrieveRequestTypeDef,
        ):
            target_parameter: KnowledgeBaseVectorSearchConfigurationTypeDef = (
                retrieve_parameter.get("retrievalConfiguration", {}).get(
                    "vectorSearchConfiguration", {}
                )
            )
            # If overrideSearchType exists, remove it
            if "overrideSearchType" in target_parameter:
                del target_parameter["overrideSearchType"]

        # Get Knowledge Base from Bedrock Agent API :: get_knowledge_base
        knowledge_base_info = get_knowledge_base_info(
            knowledge_base_id=knowledge_base_id
        )
        # Check the knowledge base resource type
        if (
            knowledge_base_info.knowledge_base.knowledge_base_configuration.type
            == "KENDRA"
        ):
            # Omit overrideSearchType option when the type is "KENDRA"
            omit_override_search_type_parameter(retrieve_parameter)

        # Send retrieve request
        response = agent_client.retrieve(**retrieve_parameter)

        def extract_source_from_retrieval_result(
            retrieval_result: KnowledgeBaseRetrievalResultTypeDef,
        ) -> tuple[str, str] | None:
            """Extract source URL/URI from retrieval result based on location type."""
            location = retrieval_result.get("location", {})
            location_type = location.get("type")

            if location_type == "WEB":
                url = location.get("webLocation", {}).get("url", "")
                return (url, url)

            elif location_type == "S3":
                uri = location.get("s3Location", {}).get("uri", "")
                source_name = urlparse(url=uri).path.split("/")[-1]
                return (source_name, uri)

            elif location_type == "CONFLUENCE":
                url = location.get("confluenceLocation", {}).get("url", "")
                return (url, url) if url else None

            elif location_type == "SALESFORCE":
                url = location.get("salesforceLocation", {}).get("url", "")
                return (url, url) if url else None

            elif location_type == "SHAREPOINT":
                url = location.get("sharePointLocation", {}).get("url", "")
                return (url, url) if url else None

            elif location_type == "KENDRA":
                url = location.get("kendraDocumentLocation", {}).get("uri", "")
                return (url, url) if url else None

            return None

        search_results = []
        for i, retrieval_result in enumerate(response.get("retrievalResults", [])):
            content = retrieval_result.get("content", {}).get("text", "")
            source = extract_source_from_retrieval_result(retrieval_result)

            if source is not None:
                # get page number from metadata
                metadata = retrieval_result.get("metadata", {})
                page_number = None
                if "x-amz-bedrock-kb-document-page-number" in metadata:
                    try:
                        page_number = int(
                            metadata["x-amz-bedrock-kb-document-page-number"]
                        )
                    except (ValueError, TypeError):
                        pass

                search_results.append(
                    SearchResult(
                        rank=i,
                        bot_id=bot.id,
                        content=content,
                        source_name=source[0],
                        source_link=source[1],
                        metadata=metadata,
                        page_number=page_number,
                    )
                )

        return search_results

    except ClientError as e:
        logger.error(f"Error querying Bedrock Knowledge Base: {e}")
        raise e


def search_related_docs(bot: BotModel, query: str) -> list[SearchResult]:
    return _bedrock_knowledge_base_search(bot, query)
