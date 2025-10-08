"""Configuration and environment setup for the agent core runtime."""

import logging
import os
from typing import Any

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

WORKSPACE_DIR = "/tmp/ws"

DEFAULT_MAX_ITERATIONS = 20

FIXED_SYSTEM_PROMPT = f"""## About File Output
- You are running on AWS Bedrock AgentCore. Therefore, when writing files, always write them under `{WORKSPACE_DIR}`.
- Similarly, if you need a workspace, please use the `{WORKSPACE_DIR}` directory. Do not ask the user about their current workspace. It's always `{WORKSPACE_DIR}`.
- Also, users cannot directly access files written under `{WORKSPACE_DIR}`. So when submitting these files to users, *always upload them to S3 using the `upload_file_to_s3_and_retrieve_s3_url` tool and provide the S3 URL*. The S3 URL must be included in the final output.
- If the output file is an image file, the S3 URL output must be in Markdown format.
"""


def get_aws_credentials() -> dict[str, str]:
    """Get AWS credentials from environment or IAM role"""
    credentials = {}

    if "AWS_ACCESS_KEY_ID" in os.environ:
        credentials["AWS_ACCESS_KEY_ID"] = os.environ["AWS_ACCESS_KEY_ID"]
    if "AWS_SECRET_ACCESS_KEY" in os.environ:
        credentials["AWS_SECRET_ACCESS_KEY"] = os.environ["AWS_SECRET_ACCESS_KEY"]
    if "AWS_SESSION_TOKEN" in os.environ:
        credentials["AWS_SESSION_TOKEN"] = os.environ["AWS_SESSION_TOKEN"]

    credentials["AWS_REGION"] = os.environ.get("AWS_REGION", "us-east-1")

    return credentials


def get_uv_environment() -> dict[str, str]:
    """Get UV environment with AWS credentials"""
    aws_creds = get_aws_credentials()
    return {
        "UV_NO_CACHE": "1",
        "UV_PYTHON": "/usr/local/bin/python",
        "UV_TOOL_DIR": "/tmp/.uv/tool",
        "UV_TOOL_BIN_DIR": "/tmp/.uv/tool/bin",
        "UV_PROJECT_ENVIRONMENT": "/tmp/.venv",
        "npm_config_cache": "/tmp/.npm",
        **aws_creds,
    }


def get_system_prompt(user_system_prompt: str = None) -> str:
    """Combine user system prompt with fixed system prompt"""
    if user_system_prompt:
        return f"{user_system_prompt}\n{FIXED_SYSTEM_PROMPT}"
    else:
        return FIXED_SYSTEM_PROMPT


def extract_model_info(model_info: Any) -> tuple[str, str]:
    """Extract model ID and region from model info"""
    aws_creds = get_aws_credentials()

    if isinstance(model_info, str):
        model_id = model_info
        region = aws_creds.get("AWS_REGION", "us-east-1")
    else:
        model_id = model_info.get("modelId", "us.anthropic.claude-3-5-sonnet-20241022-v2:0")
        region = model_info.get("region", aws_creds.get("AWS_REGION", "us-east-1"))

    return model_id, region


def get_max_iterations() -> int:
    """Get maximum iterations from environment or default to {DEFAULT_MAX_ITERATIONS}"""
    try:
        return int(os.environ.get("MAX_ITERATIONS", DEFAULT_MAX_ITERATIONS))
    except ValueError:
        logger.warning(f"Invalid MAX_ITERATIONS value. Defaulting to {DEFAULT_MAX_ITERATIONS}.")
        return DEFAULT_MAX_ITERATIONS
