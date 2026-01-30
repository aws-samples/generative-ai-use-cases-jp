"""Tool management for the research agent core runtime."""

import logging
import os
from typing import Any, Dict
import json

logger = logging.getLogger(__name__)


class ToolManager:
    """Manages MCP server configurations."""

    def __init__(self):
        self.session_id = None
        self.trace_id = None

    def set_session_info(self, session_id: str, trace_id: str):
        """Set session and trace IDs for tool operations"""
        self.session_id = session_id
        self.trace_id = trace_id

    def get_mcp_config(self, mcp_servers: list[str] | None = None) -> Dict[str, Dict[str, Any]]:
        """
        Get MCP server configurations.
        
        Args:
            mcp_servers: Optional list of MCP server names to load.
                        If None, loads default configuration from mcp.json.
                        If empty list, returns empty config.
        
        Returns:
            Dict of MCP server configurations with API keys injected
        """
        if isinstance(mcp_servers, list) and len(mcp_servers) == 0:
            return {}
        
        # Load from MCP_CONFIG_PATH or use default
        mcp_config_path = os.environ.get("MCP_CONFIG_PATH")
        
        if mcp_config_path and os.path.exists(mcp_config_path):
            with open(mcp_config_path) as f:
                mcp_config = json.load(f)
            available_servers = mcp_config.get("mcpServers", {})
        else:
            available_servers = self._get_default_mcp_config()
        
        # Inject API keys from environment variables
        self._inject_api_keys(available_servers)
        
        # Filter by requested servers if specified
        if mcp_servers is not None:
            filtered_servers = {
                name: config
                for name, config in available_servers.items()
                if name in mcp_servers
            }
            return filtered_servers
        
        return available_servers

    def _inject_api_keys(self, servers: Dict[str, Dict[str, Any]]):
        """Inject API keys from environment variables into MCP server configs"""
        
        # Brave Search API Key - inject into all brave-search-* servers
        brave_api_key = os.getenv("BRAVE_API_KEY", "")
        if brave_api_key:
            for server_name in servers.keys():
                if server_name.startswith("brave-search"):
                    if "env" not in servers[server_name]:
                        servers[server_name]["env"] = {}
                    servers[server_name]["env"]["BRAVE_API_KEY"] = brave_api_key
        
        # Tavily API Key
        tavily_api_key = os.getenv("TAVILY_API_KEY", "")
        if tavily_api_key and "tavily-remote-mcp" in servers:
            args = servers["tavily-remote-mcp"].get("args", [])
            for i, arg in enumerate(args):
                if isinstance(arg, str) and "tavilyApiKey=" in arg:
                    args[i] = arg.replace("tavilyApiKey=", f"tavilyApiKey={tavily_api_key}")

    def _get_default_mcp_config(self) -> Dict[str, Dict[str, Any]]:
        """Get default MCP server configuration"""
        config = {}
        
        # Brave Search MCP (single instance)
        brave_api_key = os.getenv("BRAVE_API_KEY", "")
        if brave_api_key:
            config["brave-search"] = {
                "command": "npx",
                "args": ["-y", "@brave/brave-search-mcp-server"],
                "env": {"BRAVE_API_KEY": brave_api_key}
            }
        
        # AWS Knowledge MCP Server (HTTP direct - no uvx wrapper for better performance)
        config["aws-knowledge-mcp-server"] = {
            "url": "https://knowledge-mcp.global.api.aws",
            "type": "http"
        }
        
        # Time MCP Server
        config["time-mcp-server"] = {
            "command": "uvx",
            "args": ["mcp-server-time"]
        }
        
        # Tavily Remote MCP (optional, single key)
        tavily_api_key = os.getenv("TAVILY_API_KEY", "")
        if tavily_api_key:
            config["tavily-remote-mcp"] = {
                "command": "npx",
                "args": ["-y", "mcp-remote", f"https://mcp.tavily.com/mcp/?tavilyApiKey={tavily_api_key}"],
                "env": {}
            }
        
        return config
