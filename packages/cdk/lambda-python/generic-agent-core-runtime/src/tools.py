"""Tool management for the agent core runtime."""

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import boto3
from mcp import StdioServerParameters, stdio_client
from strands import tool
from strands.tools.mcp import MCPClient

from .config import WORKSPACE_DIR, get_aws_credentials, get_uv_environment

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


def _create_mcp_client(server_name: str, server_config: dict, uv_env: dict) -> tuple[str, MCPClient | None]:
    """Create and start an MCP client (for parallel execution)"""
    try:
        client = MCPClient(
            lambda: stdio_client(
                StdioServerParameters(
                    command=server_config["command"],
                    args=server_config.get("args", []),
                    env={**uv_env, **server_config.get("env", {})},
                )
            )
        )
        client.start()
        return server_name, client
    except Exception as e:
        logger.error(f"Error creating MCP client for {server_name}: {e}")
        return server_name, None


class ToolManager:
    """Manages tools including MCP tools and built-in tools."""

    def __init__(self):
        self.mcp_tools = None
        self.mcp_instructions: list[str] = []
        self.session_id = None
        self.trace_id = None

    def set_session_info(self, session_id: str, trace_id: str):
        """Set session and trace IDs for tool operations"""
        self.session_id = session_id
        self.trace_id = trace_id

    def load_mcp_tools(self) -> list[Any]:
        """Load MCP tools from environment variable or mcp.json file"""
        if self.mcp_tools is not None:
            return self.mcp_tools

        try:
            # Log UV environment configuration
            uv_env = get_uv_environment()

            # Load from MCP_CONFIG_PATH
            mcp_config_path = os.environ.get("MCP_CONFIG_PATH")
            if mcp_config_path and os.path.exists(mcp_config_path):
                logger.info(f"Loading MCP configuration from {mcp_config_path}")
                with open(mcp_config_path) as f:
                    mcp_config = json.load(f)
                mcp_servers = mcp_config.get("mcpServers", {})
            else:
                return []

            mcp_clients = []

            with ThreadPoolExecutor() as executor:
                futures = [executor.submit(_create_mcp_client, name, config, uv_env) for name, config in mcp_servers.items()]
                for future in futures:
                    name, client = future.result()
                    if client:
                        mcp_clients.append(client)

            # Flatten the tools
            self.mcp_tools = sum([c.list_tools_sync() for c in mcp_clients], [])

            # Collect server instructions from MCP servers
            for client in mcp_clients:
                if hasattr(client, "server_instructions") and client.server_instructions:
                    logger.info(f"Collected server instructions ({len(client.server_instructions)} chars)")
                    self.mcp_instructions.append(client.server_instructions)

            logger.info(f"Loaded {len(self.mcp_tools)} MCP tools")
            return self.mcp_tools

        except Exception as e:
            logger.error(f"Error loading MCP tools: {e}")
            self.mcp_tools = []
            return self.mcp_tools

    def load_mcp_tools_by_names(self, server_names: list[str]) -> list[Any]:
        """Load MCP tools from environment variable or mcp.json by server names"""
        if not server_names:
            return []

        try:
            # Log UV environment configuration
            uv_env = get_uv_environment()

            # Load from MCP_CONFIG_PATH
            mcp_config_path = os.environ.get("MCP_CONFIG_PATH")
            if mcp_config_path and os.path.exists(mcp_config_path):
                logger.info(f"Loading MCP configuration from {mcp_config_path}")
                with open(mcp_config_path) as f:
                    mcp_config = json.load(f)
                available_servers = mcp_config.get("mcpServers", {})
            else:
                return []

            logger.info(f"Found {len(available_servers)} available MCP servers")
            mcp_clients = []

            servers_to_load = {name: available_servers[name] for name in server_names if name in available_servers}

            with ThreadPoolExecutor() as executor:
                futures = [executor.submit(_create_mcp_client, name, config, uv_env) for name, config in servers_to_load.items()]
                for future in futures:
                    name, client = future.result()
                    if client:
                        mcp_clients.append(client)
                        logger.info(f"Successfully loaded MCP server: {name}")

            # Flatten the tools
            dynamic_tools = sum([c.list_tools_sync() for c in mcp_clients], [])

            # Collect server instructions from dynamically loaded MCP servers
            for client in mcp_clients:
                if hasattr(client, "server_instructions") and client.server_instructions:
                    logger.info(f"Collected server instructions ({len(client.server_instructions)} chars)")
                    self.mcp_instructions.append(client.server_instructions)

            logger.info(f"Loaded {len(dynamic_tools)} MCP tools from {len(mcp_clients)} servers")
            return dynamic_tools

        except Exception as e:
            logger.error(f"Error loading MCP tools by names: {e}")
            return []

    def get_upload_tool(self):
        """Get the S3 upload tool with session context"""
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
                logger.warning("FILE_BUCKET environment variable not set. Using local file path for testing.")
                return f"Local file path (S3 upload skipped): {filepath}"

            aws_creds = get_aws_credentials()
            region = aws_creds.get("AWS_REGION", "us-east-1")

            if not filepath.startswith(WORKSPACE_DIR):
                raise ValueError(f"{filepath} does not appear to be a file under the {WORKSPACE_DIR} directory. Files to be uploaded must exist under {WORKSPACE_DIR}.")

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

    def get_file_write_tool(self):
        """Get the file write tool scoped to WORKSPACE_DIR"""

        @tool
        def write_file(filepath: str, content: str, mode: str = "create", old_str: str = "", new_str: str = "") -> str:
            """Write, append, or edit a file under /tmp/ws.

            Args:
                filepath: Path to the file (must be under /tmp/ws).
                content: Text content to write (for create/append modes).
                mode: "create" to create/overwrite, "append" to append, "str_replace" to replace text.
                old_str: Text to find (required for str_replace mode). Must match exactly once.
                new_str: Replacement text (for str_replace mode). Empty string to delete.
            """
            filepath = os.path.normpath(filepath)
            if not filepath.startswith(WORKSPACE_DIR):
                raise ValueError(f"Path must be under {WORKSPACE_DIR}. Got: {filepath}")
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            if mode == "str_replace":
                if not old_str:
                    raise ValueError("old_str is required for str_replace mode")
                with open(filepath, encoding="utf-8") as f:
                    text = f.read()
                count = text.count(old_str)
                if count == 0:
                    raise ValueError(f"old_str not found in {filepath}")
                if count > 1:
                    raise ValueError(f"old_str found {count} times in {filepath}. Must be unique.")
                text = text.replace(old_str, new_str, 1)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(text)
                return f"Replaced in {filepath}"
            else:
                flag = "a" if mode == "append" else "w"
                with open(filepath, flag, encoding="utf-8") as f:
                    f.write(content)
                return f"Wrote {len(content)} chars to {filepath} (mode={mode})"

        return write_file

    def get_concat_files_tool(self):
        """Get the file concatenation tool scoped to WORKSPACE_DIR"""

        @tool
        def concat_files(source_paths: list[str], destination: str) -> str:
            """Concatenate multiple files into one. All paths must be under /tmp/ws.

            Args:
                source_paths: List of file paths to concatenate in order.
                destination: Output file path.
            """
            for p in source_paths + [destination]:
                normed = os.path.normpath(p)
                if not normed.startswith(WORKSPACE_DIR):
                    raise ValueError(f"Path must be under {WORKSPACE_DIR}. Got: {p}")
            with open(os.path.normpath(destination), "w", encoding="utf-8") as out:
                for p in source_paths:
                    with open(os.path.normpath(p), "r", encoding="utf-8") as f:
                        out.write(f.read())
            return f"Concatenated {len(source_paths)} files into {destination}"

        return concat_files

    def get_web_fetch_tool(self):
        """Get the web fetch tool"""

        @tool
        def web_fetch(url: str, max_chars: int = 50000) -> str:
            """Fetch text content from a URL. Useful for reading web pages, documentation, or API responses.

            Args:
                url: The URL to fetch.
                max_chars: Maximum characters to return (default 50000).
            """
            import urllib.request

            req = urllib.request.Request(url, headers={"User-Agent": "GenU-AgentCore/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                content_type = resp.headers.get("Content-Type", "")
                raw = resp.read().decode("utf-8", errors="replace")

            # Strip HTML tags for readability if HTML
            if "html" in content_type:
                from html.parser import HTMLParser

                class _TextExtractor(HTMLParser):
                    def __init__(self):
                        super().__init__()
                        self._parts: list[str] = []
                        self._skip = False

                    def handle_starttag(self, tag, attrs):
                        if tag in ("script", "style"):
                            self._skip = True

                    def handle_endtag(self, tag):
                        if tag in ("script", "style"):
                            self._skip = False

                    def handle_data(self, data):
                        if not self._skip:
                            self._parts.append(data)

                extractor = _TextExtractor()
                extractor.feed(raw)
                raw = " ".join(extractor._parts)
                import re

                raw = re.sub(r"\s+", " ", raw).strip()

            if len(raw) > max_chars:
                raw = raw[:max_chars] + f"\n\n[Truncated at {max_chars} chars]"
            return raw

        return web_fetch

    def get_code_interpreter_tool(self) -> list[Any]:
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

    def get_mcp_instructions(self) -> str:
        """Return collected MCP Server Instructions as a single string.

        Server Instructions are provided by MCP servers during initialization
        to guide the LLM on how to use their tools effectively.
        See: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#initialization

        Returns:
            Combined instructions from all connected MCP servers, or empty string if none.
        """
        if not self.mcp_instructions:
            return ""
        return "\n\n---\n\n".join(inst.strip() for inst in self.mcp_instructions)

    def get_tools_with_options(self, code_execution_enabled: bool = False, mcp_servers=None) -> list[Any]:
        """
        Get tools with optional code execution and MCP servers.

        Args:
            code_execution_enabled: Whether to include code interpreter tools
            mcp_servers: MCP server configurations
                - None: Load default MCP servers from mcp.json
                - []: Empty list, no MCP servers (File Upload only)
                - [...]: Load specified MCP servers

        Returns:
            List of all available tools
        """
        logger.info(f"get_tools_with_options called with code_execution_enabled={code_execution_enabled}")
        logger.info(f"mcp_servers parameter: {mcp_servers} (type: {type(mcp_servers)})")

        all_tools = []

        # Handle MCP servers based on parameter
        if mcp_servers is None:
            # Load default MCP servers from mcp.json
            logger.info("Loading default MCP servers from mcp.json")
            mcp_tools = self.load_mcp_tools()
        elif isinstance(mcp_servers, list) and len(mcp_servers) == 0:
            # Empty list: no MCP servers
            logger.info("Empty MCP servers list provided, skipping MCP tools")
            mcp_tools = []
        elif isinstance(mcp_servers, list):
            # Load specified MCP servers by name
            logger.info(f"Loading {len(mcp_servers)} user-specified MCP servers by name")
            mcp_tools = self.load_mcp_tools_by_names(mcp_servers)
        else:
            # Fallback to default
            logger.warning(f"Unexpected mcp_servers type: {type(mcp_servers)}, using default")
            mcp_tools = self.load_mcp_tools()

        all_tools.extend(mcp_tools)

        # Add built-in tools (always included)
        upload_tool = self.get_upload_tool()
        file_write_tool = self.get_file_write_tool()
        concat_tool = self.get_concat_files_tool()
        web_fetch_tool = self.get_web_fetch_tool()
        all_tools.append(upload_tool)
        all_tools.append(file_write_tool)
        all_tools.append(concat_tool)
        all_tools.append(web_fetch_tool)

        # Add code interpreter tools if enabled
        code_interpreter_tools = []
        if code_execution_enabled:
            code_interpreter_tools = self.get_code_interpreter_tool()
            all_tools.extend(code_interpreter_tools)

        # Log final tool count
        logger.info(f"Total tools loaded: {len(all_tools)} (MCP: {len(mcp_tools)}, Built-in: 4, Code Interpreter: {len(code_interpreter_tools)} - {'enabled' if code_execution_enabled else 'disabled'})")

        return all_tools
