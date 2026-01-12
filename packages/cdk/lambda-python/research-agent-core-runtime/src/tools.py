"""Tool management for the research agent core runtime."""

import json
import logging
import os
import random
from typing import Any, Dict

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
            logger.info("Empty MCP servers list provided, skipping MCP tools")
            return {}
        
        # Load from MCP_CONFIG_PATH or use default
        mcp_config_path = os.environ.get("MCP_CONFIG_PATH")
        if mcp_config_path and os.path.exists(mcp_config_path):
            logger.info(f"Loading MCP configuration from {mcp_config_path}")
            with open(mcp_config_path) as f:
                mcp_config = json.load(f)
            available_servers = mcp_config.get("mcpServers", {})
        else:
            # Use default configuration
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
            logger.info(f"Filtered to {len(filtered_servers)} requested MCP servers")
            return filtered_servers
        
        logger.info(f"Loaded {len(available_servers)} MCP servers")
        return available_servers

    def _inject_api_keys(self, servers: Dict[str, Dict[str, Any]]):
        """Inject API keys from environment variables into MCP server configs"""
        
        # Brave Search API Keys - Support up to 4 instances for parallel search
        brave_api_keys = os.getenv("BRAVE_API_KEYS")
        if brave_api_keys:
            try:
                keys = json.loads(brave_api_keys)
                if keys and isinstance(keys, list):
                    # Inject keys into brave-search-1 through brave-search-4
                    for i, server_name in enumerate(["brave-search-1", "brave-search-2", "brave-search-3", "brave-search-4"]):
                        if server_name in servers and i < len(keys):
                            if "env" not in servers[server_name]:
                                servers[server_name]["env"] = {}
                            servers[server_name]["env"]["BRAVE_API_KEY"] = keys[i]
                            logger.info(f"Injected Brave API Key {i+1} into {server_name} MCP server")
                    
                    # Legacy support for single brave-search server
                    if "brave-search" in servers:
                        api_key = random.choice(keys)
                        if "env" not in servers["brave-search"]:
                            servers["brave-search"]["env"] = {}
                        servers["brave-search"]["env"]["BRAVE_API_KEY"] = api_key
                        logger.info("Injected Brave API Key into brave-search MCP server")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse BRAVE_API_KEYS: {e}")
        
        # Tavily API Key
        tavily_api_keys = os.getenv("TAVILY_API_KEYS")
        if tavily_api_keys and "tavily-remote-mcp" in servers:
            try:
                keys = json.loads(tavily_api_keys)
                if keys and isinstance(keys, list):
                    api_key = random.choice(keys)
                    # Inject into URL args
                    args = servers["tavily-remote-mcp"].get("args", [])
                    for i, arg in enumerate(args):
                        if "tavilyApiKey=" in arg:
                            args[i] = arg.replace("tavilyApiKey=", f"tavilyApiKey={api_key}")
                    logger.info("Injected Tavily API Key into tavily-remote-mcp MCP server")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse TAVILY_API_KEYS: {e}")

    def _get_default_mcp_config(self) -> Dict[str, Dict[str, Any]]:
        """Get default MCP server configuration"""
        config = {}
        
        # Brave Search MCP - Support up to 4 instances for parallel search
        brave_api_keys = os.getenv("BRAVE_API_KEYS")
        if brave_api_keys:
            try:
                keys = json.loads(brave_api_keys)
                if keys and isinstance(keys, list):
                    # Create up to 4 Brave Search instances
                    for i, api_key in enumerate(keys[:4]):
                        server_name = f"brave-search-{i+1}"
                        config[server_name] = {
                            "command": "npx",
                            "args": ["-y", "@brave/brave-search-mcp-server"],
                            "env": {"BRAVE_API_KEY": api_key}
                        }
                    
                    # Legacy single instance for backward compatibility
                    if len(keys) == 1:
                        config["brave-search"] = {
                            "command": "npx",
                            "args": ["-y", "@brave/brave-search-mcp-server"],
                            "env": {"BRAVE_API_KEY": keys[0]}
                        }
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse BRAVE_API_KEYS: {e}")
        
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
        
        # Tavily Remote MCP (optional)
        tavily_api_keys = os.getenv("TAVILY_API_KEYS")
        if tavily_api_keys:
            try:
                keys = json.loads(tavily_api_keys)
                if keys and isinstance(keys, list):
                    api_key = random.choice(keys)
                    config["tavily-remote-mcp"] = {
                        "command": "npx",
                        "args": ["-y", "mcp-remote", f"https://mcp.tavily.com/mcp/?tavilyApiKey={api_key}"],
                        "env": {}
                    }
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse TAVILY_API_KEYS: {e}")
        
        return config
