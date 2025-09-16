import logging

from app.utils import get_bedrock_agent_client
from app.repositories.models.custom_bot_kb import (
    BedrockAgentGetKnowledgeBaseResponse,
    KnowledgeBase,
    KnowledgeBaseConfiguration,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def get_knowledge_base_info(
    knowledge_base_id: str | None,
) -> BedrockAgentGetKnowledgeBaseResponse:
    client = get_bedrock_agent_client()
    try:
        response = client.get_knowledge_base(knowledgeBaseId=knowledge_base_id)
        return BedrockAgentGetKnowledgeBaseResponse(
            knowledge_base=KnowledgeBase(
                knowledge_base_configuration=KnowledgeBaseConfiguration(
                    type=response.get("knowledgeBase", {})
                    .get("knowledgeBaseConfiguration", {})
                    .get("type", "VECTOR")
                )
            )
        )
    except Exception as e:
        logger.error(f"Failed to get knowledge base info: {e}")
        return BedrockAgentGetKnowledgeBaseResponse(
            knowledge_base=KnowledgeBase(
                knowledge_base_configuration=KnowledgeBaseConfiguration(type="VECTOR")
            )
        )
