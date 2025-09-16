import logging
import traceback

from app.agents.tools.agent_tool import AgentTool
from app.repositories.models.custom_bot import BotModel
from app.routes.schemas.conversation import type_model_name
from app.vector_search import search_related_docs

from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class KnowledgeToolInput(BaseModel):
    query: str = Field(
        description="Input suitable for vector search, full text search, and hybrid search. When searching continuously, the query must be designed so that it does not overlap with past contexts."
    )


def search_knowledge(
    tool_input: KnowledgeToolInput, bot: BotModel | None, model: type_model_name | None
) -> list:
    assert bot is not None

    query = tool_input.query
    logger.info(f"Running AnswerWithKnowledgeTool with query: {query}")

    try:
        search_results = search_related_docs(
            bot,
            query=query,
        )

        # # For testing purpose
        # search_results = dummy_search_results

        return search_results

    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(
            f"Failed to run AnswerWithKnowledgeTool: {e}\nTraceback: {error_traceback}"
        )
        raise e


def create_knowledge_tool(bot: BotModel) -> AgentTool:
    description = (
        "Answer a user's question using information. The description is: {}".format(
            bot.knowledge.__str_in_claude_format__()
        )
    )
    logger.info(f"Creating knowledge base tool with description: {description}")
    return AgentTool(
        name=f"knowledge_base_tool",
        description=description,
        args_schema=KnowledgeToolInput,
        function=search_knowledge,
    )
