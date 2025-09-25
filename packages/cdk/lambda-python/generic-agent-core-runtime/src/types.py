"""Data models for the agent core runtime."""

from strands.types.content import Message
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union


class ModelInfo(BaseModel):
    modelId: str
    region: str = "us-east-1"


class AgentCoreRequest(BaseModel):
    """Request model for AgentCore Runtime."""
    messages: Union[List[Message], List[Dict[str, Any]]] = []
    system_prompt: Optional[str] = None
    prompt: Union[str, List[Dict[str, Any]]] = ""
    model: ModelInfo = {}
    user_id: Optional[str] = None  # User identification for MCP isolation
    mcp_servers: Optional[List[str]] = None  # MCP server names from mcp.json
    session_id: Optional[str] = None  # Session identifier
    agent_id: Optional[str] = None  # Agent identifier for logging and tracking
