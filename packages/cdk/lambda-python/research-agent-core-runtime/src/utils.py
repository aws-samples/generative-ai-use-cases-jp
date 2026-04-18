"""Utility functions for the research agent core runtime."""

import json
import logging
import os
import shutil
from typing import Any, Dict, List

from src.config import WORKSPACE_DIR

logger = logging.getLogger(__name__)


def create_ws_directory():
    """Create workspace directory"""
    os.makedirs(WORKSPACE_DIR, exist_ok=True)


def clean_ws_directory():
    """Clean workspace directory"""
    if os.path.exists(WORKSPACE_DIR):
        try:
            shutil.rmtree(WORKSPACE_DIR)
        except Exception as e:
            logger.warning(f"Failed to clean workspace directory: {e}")


def create_error_response(message: str) -> Dict[str, Any]:
    """Create error response"""
    return {
        "error": message,
        "status": "error"
    }


def process_messages(messages: List[Dict[str, Any]]) -> str:
    """
    Process messages into a conversation history string.
    
    Args:
        messages: List of message dictionaries with role and content
        
    Returns:
        Formatted conversation history string
    """
    if not messages:
        return ""
    
    parts = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", [])
        
        # Extract text from content blocks
        text_parts = []
        for content_block in content:
            if isinstance(content_block, dict) and "text" in content_block:
                text_parts.append(content_block["text"])
            elif isinstance(content_block, str):
                text_parts.append(content_block)
        
        if text_parts:
            role_label = "Human" if role == "user" else "Assistant"
            parts.append(f"{role_label}: {' '.join(text_parts)}")
    
    return "\n\n".join(parts)


def process_prompt(prompt: str | List[Dict[str, Any]]) -> str:
    """
    Process prompt into a string.
    
    Args:
        prompt: Either a string or list of content blocks
        
    Returns:
        Prompt string
    """
    if isinstance(prompt, str):
        return prompt
    
    if isinstance(prompt, list):
        text_parts = []
        for content_block in prompt:
            if isinstance(content_block, dict) and "text" in content_block:
                text_parts.append(content_block["text"])
            elif isinstance(content_block, str):
                text_parts.append(content_block)
        return "\n".join(text_parts)
    
    return str(prompt)
