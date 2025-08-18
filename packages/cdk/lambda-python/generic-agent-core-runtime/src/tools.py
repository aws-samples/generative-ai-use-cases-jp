"""Tool management for the agent core runtime."""

import os
import boto3
import json
import logging
from strands import tool
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters
from typing import List, Any
from .config import get_uv_environment, get_aws_credentials, WORKSPACE_DIR

# Import strands-agents code interpreter tool
try:
    from strands_tools.code_interpreter import AgentCoreCodeInterpreter
    CODE_INTERPRETER_AVAILABLE = True
except ImportError as e:
    CODE_INTERPRETER_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"Strands code interpreter tool not available: {e}")
    AgentCoreCodeInterpreter = None

logger = logging.getLogger(__name__)


class ToolManager:
    """Manages tools including MCP tools and built-in tools."""
    
    def __init__(self):
        self.mcp_tools = None
        self.session_id = None
        self.trace_id = None
    
    def set_session_info(self, session_id: str, trace_id: str):
        """Set session and trace IDs for tool operations"""
        self.session_id = session_id
        self.trace_id = trace_id
    
    def load_mcp_tools(self) -> List[Any]:
        """Load MCP tools from mcp.json"""
        if self.mcp_tools is not None:
            return self.mcp_tools
            
        try:
            with open("mcp.json", "r") as f:
                mcp_json = json.loads(f.read())

                if "mcpServers" not in mcp_json:
                    logger.warning("mcpServers not defined in mcp.json")
                    self.mcp_tools = []
                    return self.mcp_tools

                mcp_servers = mcp_json["mcpServers"]
                mcp_clients = []
                uv_env = get_uv_environment()

                for server_name, server in mcp_servers.items():
                    try:
                        client = MCPClient(
                            lambda: stdio_client(
                                StdioServerParameters(
                                    command=server["command"],
                                    args=server.get("args", []),
                                    env={**uv_env, **server.get("env", {})},
                                )
                            )
                        )
                        client.start()
                        mcp_clients.append(client)
                    except Exception as e:
                        logger.error(f"Error creating MCP client for {server_name}: {e}")

                # Flatten the tools
                self.mcp_tools = sum([c.list_tools_sync() for c in mcp_clients], [])
                logger.info(f"Loaded {len(self.mcp_tools)} MCP tools")
                return self.mcp_tools
        except Exception as e:
            logger.error(f"Error loading MCP tools: {e}")
            self.mcp_tools = []
            return self.mcp_tools
    
    def get_upload_tool(self):
        """Get the S3 upload tool with session context"""
        session_id = self.session_id
        trace_id = self.trace_id
        
        @tool
        def upload_file_to_s3_and_retrieve_s3_url(filepath: str) -> str:
            """Upload the file at /tmp/ws/* and retrieve the s3 path

            Args:
                filepath: The path to the uploading file
            """
            bucket = os.environ.get("FILE_BUCKET")
            if not bucket:
                # For local testing, provide a fallback message
                logger.warning(
                    "FILE_BUCKET environment variable not set. Using local file path for testing."
                )
                return f"Local file path (S3 upload skipped): {filepath}"

            aws_creds = get_aws_credentials()
            region = aws_creds.get("AWS_REGION", "us-east-1")

            if not filepath.startswith(WORKSPACE_DIR):
                raise ValueError(
                    f"{filepath} does not appear to be a file under the {WORKSPACE_DIR} directory. Files to be uploaded must exist under {WORKSPACE_DIR}."
                )

            try:
                filename = os.path.basename(filepath)
                key = f"agentcore/{trace_id}/{filename}"

                s3 = boto3.client("s3", region_name=region)
                s3.upload_file(filepath, bucket, key)

                return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
            except Exception as e:
                logger.error(f"Error uploading file to S3: {e}")
                # For local testing, provide a fallback
                return f"Error uploading to S3: {str(e)}. Local file path: {filepath}"
        
        return upload_file_to_s3_and_retrieve_s3_url
    
    def get_code_interpreter_tool(self) -> List[Any]:
        """Get code interpreter tool if available"""
        code_interpreter_tools = []
        
        if CODE_INTERPRETER_AVAILABLE and AgentCoreCodeInterpreter:
            try:
                aws_creds = get_aws_credentials()
                region = aws_creds.get("AWS_REGION", "us-east-1")
                code_interpreter = AgentCoreCodeInterpreter(region=region)
                code_interpreter_tools.append(code_interpreter.code_interpreter)
                logger.info("Added code_interpreter tool (AgentCoreCodeInterpreter)")
            except Exception as e:
                logger.warning(f"Failed to initialize AgentCoreCodeInterpreter: {e}")
        
        return code_interpreter_tools
    
    def get_all_tools(self) -> List[Any]:
        """Get all available tools (MCP + built-in + code interpreter)"""
        mcp_tools = self.load_mcp_tools()
        upload_tool = self.get_upload_tool()
        code_interpreter_tools = self.get_code_interpreter_tool()
        
        all_tools = mcp_tools + [upload_tool] + code_interpreter_tools
        logger.info(f"Total tools loaded: {len(all_tools)} (MCP: {len(mcp_tools)}, Built-in: 1, Code Interpreter: {len(code_interpreter_tools)})")
        
        return all_tools