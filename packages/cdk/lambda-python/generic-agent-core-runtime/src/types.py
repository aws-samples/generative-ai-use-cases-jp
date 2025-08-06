"""Data models for the agent core runtime."""

from strands.types.content import Message
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union


class ModelInfo(BaseModel):
    modelId: str
    region: str = "us-east-1"


class AgentCoreRequest(BaseModel):
    messages: Union[List[Message], List[Dict[str, Any]]] = []
    system_prompt: Optional[str] = None
    prompt: Union[str, List[Dict[str, Any]]] = ""
    model: ModelInfo = {}
