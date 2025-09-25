"""Agent management for the agent core runtime."""

import boto3
import json
import logging
from strands.models import BedrockModel
from strands import Agent as StrandsAgent
from typing import List, Dict, Union, Any, Optional, AsyncGenerator
from .config import get_system_prompt, extract_model_info
from .tools import ToolManager

# Removed dynamic_mcp_manager - using simplified approach in tools.py
from .utils import (
    create_empty_response,
    create_error_response,
    process_messages,
    process_prompt,
)
from .types import ModelInfo, Message

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class AgentManager:
    """Manages Strands agent creation and execution."""

    def __init__(self):
        self.tool_manager = ToolManager()

    def set_session_info(self, session_id: str, trace_id: str):
        """Set session and trace IDs"""
        self.tool_manager.set_session_info(session_id, trace_id)

    async def process_request_streaming(
        self,
        messages: Union[List[Message], List[Dict[str, Any]]],
        system_prompt: Optional[str],
        prompt: Union[str, List[Dict[str, Any]]],
        model_info: ModelInfo,
        user_id: Optional[str] = None,
        mcp_servers: Optional[List[str]] = None,
        session_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        code_execution_enabled: Optional[bool] = False,
    ) -> AsyncGenerator[str, None]:
        """Process a request and yield streaming responses as raw events"""
        try:
            # Set session info if provided
            if session_id:
                self.set_session_info(session_id, session_id)

            # Extract model info
            model_id, region = extract_model_info(model_info)

            # Combine system prompts
            combined_system_prompt = get_system_prompt(system_prompt)

            # Get tools (MCP handling is done in ToolManager)
            tools = self.tool_manager.get_tools_with_options(
                code_execution_enabled=code_execution_enabled, mcp_servers=mcp_servers
            )
            logger.info(
                f"Loaded {len(tools)} tools (code execution: {code_execution_enabled})"
            )

            # Log agent info
            if agent_id:
                logger.debug(f"Processing agent: {agent_id}")

            # Create boto3 session and Bedrock model
            session = boto3.Session(region_name=region)
            bedrock_model = BedrockModel(
                model_id=model_id,
                boto_session=session,
                cache_prompt="default",
                cache_tools="default",
            )

            # Process messages and prompt using utility functions
            processed_messages = process_messages(messages)
            processed_prompt = process_prompt(prompt)

            # Create Strands agent and stream response
            agent = StrandsAgent(
                system_prompt=combined_system_prompt,
                messages=processed_messages,
                model=bedrock_model,
                tools=tools,
            )

            async for event in agent.stream_async(processed_prompt):
                if "event" in event:
                    yield json.dumps(event, ensure_ascii=False) + "\n"

        except Exception as e:
            logger.error(f"Error processing agent request: {e}", exc_info=True)
            error_event = {
                "event": {
                    "internalServerException": {
                        "message": f"An error occurred while processing your request: {str(e)}",
                    }
                }
            }
            yield json.dumps(error_event, ensure_ascii=False) + "\n"
        finally:
            # Cleanup is handled automatically by the dynamic MCP client
            if user_id:
                logger.debug(
                    f"Session cleanup for user {user_id} handled automatically"
                )
