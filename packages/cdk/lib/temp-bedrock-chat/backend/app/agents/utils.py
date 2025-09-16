from typing import Dict

from app.agents.tools.agent_tool import AgentTool
from app.agents.tools.internet_search import internet_search_tool
from app.agents.tools.bedrock_agent import bedrock_agent_tool, BedrockAgent
from app.agents.tools.knowledge import create_knowledge_tool
from app.repositories.models.custom_bot import BotModel
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def get_available_tools() -> list[AgentTool]:
    tools: list[AgentTool] = []
    tools.append(internet_search_tool)
    tools.append(bedrock_agent_tool)
    return tools


def get_tools(bot: BotModel | None) -> Dict[str, AgentTool]:
    """Get a dictionary of tools based on bot's tool configuration

    Args:
        bot: Bot model. Returns an empty dictionary if None

    Returns:
        Dict[str, AgentTool]: Dictionary where key is tool name and value is tool instance
    """
    tools: Dict[str, AgentTool] = {}

    # Return empty dictionary if bot is None or agent is not enabled
    if not bot or not bot.is_agent_enabled():
        return tools

    # Convert available tools to a dictionary with name as key
    available_tools = {tool.name: tool for tool in get_available_tools()}

    # Get tools based on bot's tool configuration
    for tool_config in bot.agent.tools:
        try:
            # Skip if tool is not available
            if tool_config.name not in available_tools:
                continue

            tools[tool_config.name] = available_tools[tool_config.name]

            """Update bedrock_agent tool description
            NOTE: tools["bedrock_agent"].description is used to determine which tool should be selected when a generative AI uses tooluse to resolve a user's request. 
            If an arbitrary Description is used here, it may result in undesirable behavior, such as the set Agent not being used or being used in cases where it should not be. 
            Additionally, we ensure that the latest description is retrieved each time tool use is employed because the Description of an existing Bedrock Agent may be rewritten at any time.
            """
            if (
                tool_config.name == "bedrock_agent"
                and tool_config.tool_type == "bedrock_agent"
                and tool_config.bedrockAgentConfig
                and tool_config.bedrockAgentConfig.agent_id
            ):
                try:
                    agent = BedrockAgent()
                    description = agent.get_agent_description(
                        tool_config.bedrockAgentConfig.agent_id
                    )
                    tools["bedrock_agent"].description = description
                    logger.info(
                        f"Updated bedrock_agent tool description to: {description}"
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to update bedrock_agent tool description: {e}"
                    )
        except Exception as e:
            logger.error(f"Error processing tool {tool_config.name}: {e}")

    # Add knowledge tool if bot has knowledge base
    if bot.has_knowledge():
        knowledge_tool = create_knowledge_tool(bot=bot)
        tools[knowledge_tool.name] = knowledge_tool

    return tools
