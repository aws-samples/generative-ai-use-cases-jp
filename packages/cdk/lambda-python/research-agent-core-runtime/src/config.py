"""Configuration management for the research agent core runtime."""

import logging
import os
from typing import Tuple

logger = logging.getLogger(__name__)

# Workspace directory
WORKSPACE_DIR = "/tmp/ws"


def extract_model_info(model_info: dict) -> Tuple[str, str]:
    """Extract model ID and region from model info"""
    model_id = model_info.get("modelId", "global.anthropic.claude-sonnet-4-5-20250929-v1:0")
    region = model_info.get("region", "us-east-1")
    return model_id, region


def get_max_iterations() -> int:
    """Get maximum iteration count from environment"""
    return int(os.getenv("MAX_ITERATIONS", "200"))
