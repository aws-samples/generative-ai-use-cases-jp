"""Agent management for the agent core runtime."""

import json
import logging
import litellm
from strands.models.litellm_model import LiteLLMModel
from strands import Agent as StrandsAgent
from typing import List, Dict, Union, Any, Optional, AsyncGenerator
from .config import get_system_prompt, extract_model_info, get_aws_credentials
from .tools import ToolManager
from .utils import (
    create_empty_response, 
    create_error_response,
    process_messages,
    process_prompt
)
from .types import ModelInfo, Message

logger = logging.getLogger(__name__)


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
    ) -> AsyncGenerator[str, None]:
        """Process a request and yield streaming responses as raw events"""
        try:
            # Get model info
            model_id, region = extract_model_info(model_info)
            
            # Combine system prompts
            combined_system_prompt = get_system_prompt(system_prompt)
            
            # Get all tools
            tools = self.tool_manager.get_all_tools()
            
            # Setup LiteLLM with AWS credentials
            aws_creds = get_aws_credentials()
            litellm_model = LiteLLMModel(
                model_id=f"bedrock/{model_id}",
                litellm_kwargs={
                    "aws_access_key_id": aws_creds.get("AWS_ACCESS_KEY_ID"),
                    "aws_secret_access_key": aws_creds.get("AWS_SECRET_ACCESS_KEY"),
                    "aws_session_token": aws_creds.get("AWS_SESSION_TOKEN"),
                    "aws_region_name": region,
                    "cache_prompt": "default",
                    "cache_tools": "default",
                },
            )
            
            # Process messages and prompt using utility functions
            processed_messages = process_messages(messages)
            processed_prompt = process_prompt(prompt)
            
            # Create Strands agent and stream response
            agent = StrandsAgent(
                system_prompt=combined_system_prompt,
                messages=processed_messages,
                model=litellm_model,
                tools=tools,
            )

            async for event in agent.stream_async(processed_prompt):
                if "event" in event:
                    yield json.dumps(event, ensure_ascii=False) + "\n"

        except Exception as e:
            logger.error(f"Error processing agent request: {e}")
            error_event = {
                "event": {
                    "internalServerException": {
                        "message": f"An error occurred while processing your request: {str(e)}",
                    }
                }
            }
            yield json.dumps(error_event, ensure_ascii=False) + "\n"
