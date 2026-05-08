"""Data models for the agent core runtime."""

from typing import Any

from pydantic import BaseModel
from strands.types.content import Message


class ModelInfo(BaseModel):
    modelId: str
    region: str = "us-east-1"


class AgentCoreRequest(BaseModel):
    messages: list[Message] | list[dict[str, Any]] = []
    system_prompt: str | None = None
    prompt: str | list[dict[str, Any]] = ""
    model: ModelInfo = {}
    user_id: str | None = None  # User identification for MCP isolation
    mcp_servers: list[str] | None = None  # MCP server names from mcp.json
    session_id: str | None = None  # Session identifier
    agent_id: str | None = None  # Agent identifier for logging and tracking
