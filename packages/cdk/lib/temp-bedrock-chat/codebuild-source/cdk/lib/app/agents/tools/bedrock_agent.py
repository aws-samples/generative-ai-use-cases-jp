import logging
import json
import uuid
from typing import Dict, Any

from app.agents.tools.agent_tool import AgentTool
from app.repositories.models.custom_bot import BotModel, AgentModel
from app.routes.schemas.conversation import type_model_name
from app.utils import get_bedrock_agent_client, get_bedrock_agent_runtime_client
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class BedrockAgentInput(BaseModel):
    input_text: str = Field(description="The query to ask to Bedrock Agent")


class BedrockAgent:
    def __init__(self):
        self.runtime_client = get_bedrock_agent_runtime_client()
        self.client = get_bedrock_agent_client()

    def get_agent_description(self, agent_id):
        try:
            response = self.client.get_agent(agentId=agent_id)
            return response.get("agent", {}).get("description", "Bedrock Agent")
        except Exception as e:
            logger.error(f"Failed to get agent description: {e}")
            return "Bedrock Agent"

    def invoke_agent(self, agent_id, alias_id, input_text, session_id):
        try:
            logger.info(
                f"Invoking Bedrock Agent: agent_id={agent_id}, alias_id={alias_id}"
            )
            response = self.runtime_client.invoke_agent(
                agentId=agent_id,
                agentAliasId=alias_id,
                inputText=input_text,
                sessionId=session_id,
                enableTrace=True,
            )

            # Process response
            result = []
            trace_logs = []

            for event in response["completion"]:
                # Process trace information
                if "trace" in event:
                    trace_data = event["trace"]
                    trace_logs.append(trace_data)

                if "chunk" in event:
                    content = event["chunk"]["bytes"].decode("utf-8")
                    # Create data structure to pass to RelatedDocumentModel
                    result.append(
                        {
                            "content": content,
                            "source_name": f"Agent Final Result({agent_id})",
                        }
                    )

            logger.info(f"Processed {len(result)} chunks from Bedrock Agent response")
            logger.info(f"Collected {len(trace_logs)} trace logs")

            # Add trace log information to results
            if trace_logs:
                # Format trace log information for the client
                formatted_traces = self._format_trace_for_client(trace_logs)
                for formatted_trace in formatted_traces:
                    type = formatted_trace.get("type")
                    recipient = (
                        formatted_trace.get("input").get("recipient", None)
                        if formatted_trace.get("input") != None
                        else None
                    )
                    name = formatted_trace.get("name")
                    # swith type
                    if type == "tool_use":
                        if recipient != None:
                            result.append(
                                {
                                    "content": json.dumps(
                                        formatted_trace.get("input").get("content"),
                                        default=str,
                                    ),
                                    "source_name": f"[Trance] Send Message ({agent_id}) -> ({recipient})",
                                }
                            )
                        else:
                            result.append(
                                {
                                    "content": json.dumps(
                                        formatted_trace.get("input").get("content"),
                                        default=str,
                                    ),
                                    "source_name": f"[Trance] Tool Use ({agent_id})",
                                }
                            )

                    elif type == "text":
                        if "<thinking>" in formatted_trace.get("text"):
                            result.append(
                                {
                                    "content": json.dumps(
                                        formatted_trace.get("text"), default=str
                                    ),
                                    "source_name": f"[Trance] Agent Thninking({agent_id})",
                                }
                            )
                        else:
                            result.append(
                                {
                                    "content": json.dumps(
                                        formatted_trace.get("text"), default=str
                                    ),
                                    "source_name": f"[Trance] Agent ({agent_id})",
                                }
                            )

            return result

        except Exception as e:
            logger.error(f"Error invoking Bedrock Agent: {e}")
            raise e

    def _format_trace_for_client(self, trace_logs):
        """Format trace log information for the client"""
        try:
            traces = []

            for trace in trace_logs:
                trace_data = trace.get("trace", {})

                # Skip to the next trace if required keys are missing
                if "orchestrationTrace" not in trace_data:
                    continue

                orch = trace_data["orchestrationTrace"]
                if "modelInvocationOutput" not in orch:
                    continue

                model_output = orch["modelInvocationOutput"]
                if "rawResponse" not in model_output:
                    continue

                raw_response = model_output["rawResponse"]
                if "content" not in raw_response:
                    continue

                content = raw_response["content"]
                if not isinstance(content, str):
                    continue

                # Parse JSON string
                try:
                    parsed_content = json.loads(content)
                    content_list = parsed_content.get("content", [])
                except Exception as c:
                    logger.warn(f"Issue with parsing content, it is not valid JSON {c}")
                    parsed_content = content
                    content_list = []

                logger.info(f"parsed_content: {parsed_content}")

                # Process content list
                for model_invocation_content in content_list:
                    logger.info(f"model_invocation_content: {model_invocation_content}")
                    traces.append(
                        {
                            "type": model_invocation_content.get("type"),
                            "input": model_invocation_content.get("input"),
                            "text": model_invocation_content.get("text"),
                        }
                    )
            return traces
        except Exception as e:
            logger.error(f"Error formatting trace for client: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return {"error": str(e)}


def _bedrock_agent_invoke(
    tool_input: BedrockAgentInput, bot: BotModel | None, model: type_model_name | None
) -> list:
    input_text = tool_input.input_text
    # session_id = tool_input.session_id
    session_id = str(uuid.uuid4())

    logger.info(
        f"Bedrock Agent request - Query: {input_text}, Session ID: {session_id}"
    )

    if bot is None:
        raise ValueError("Bot configuration is missing")
    logger.info(f"Bot configuration loaded: {bot.dict()}")

    # Find the Bedrock Agent tool configuration
    bedrock_tool = next(
        (tool for tool in bot.agent.tools if tool.tool_type == "bedrock_agent"), None
    )
    if not bedrock_tool or not bedrock_tool.bedrockAgentConfig:
        raise ValueError("Bedrock Agent configuration is missing")

    agent_id = bedrock_tool.bedrockAgentConfig.agent_id
    alias_id = bedrock_tool.bedrockAgentConfig.alias_id

    if not agent_id or not alias_id:
        raise ValueError("Agent ID or Alias ID is not configured")

    # Invoke Bedrock Agent
    agent = BedrockAgent()
    results = agent.invoke_agent(agent_id, alias_id, input_text, session_id)

    return results


# Create an instance of AgentTool
bedrock_agent_tool = AgentTool(
    name="bedrock_agent",
    description="Ask a question to the Bedrock Agent",  # This parameter is dynamically changed to the description set in the bedrock agent.
    args_schema=BedrockAgentInput,
    function=_bedrock_agent_invoke,
)
