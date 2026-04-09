"""Tests for MCP Server Instructions collection and injection."""

from unittest.mock import MagicMock, patch

from src.tools import ToolManager


class TestToolManagerInstructions:
    """Test ToolManager's MCP Server Instructions collection."""

    def test_initial_state_empty(self):
        tm = ToolManager()
        assert tm.mcp_instructions == []
        assert tm.get_mcp_instructions() == ""

    def test_get_mcp_instructions_single(self):
        tm = ToolManager()
        tm.mcp_instructions = ["Use tool A before tool B."]
        assert tm.get_mcp_instructions() == "Use tool A before tool B."

    def test_get_mcp_instructions_multiple(self):
        tm = ToolManager()
        tm.mcp_instructions = [
            "Server 1: Always call init first.",
            "Server 2: Rate limit is 10 req/min.",
        ]
        result = tm.get_mcp_instructions()
        assert "Server 1: Always call init first." in result
        assert "Server 2: Rate limit is 10 req/min." in result
        assert "\n\n---\n\n" in result

    def test_get_mcp_instructions_strips_whitespace(self):
        tm = ToolManager()
        tm.mcp_instructions = ["  padded instructions  \n"]
        assert tm.get_mcp_instructions() == "padded instructions"

    @patch("src.tools._create_mcp_client")
    @patch("src.tools.os.environ.get")
    @patch("src.tools.os.path.exists")
    @patch("builtins.open")
    def test_load_mcp_tools_collects_instructions(self, mock_open, mock_exists, mock_env_get, mock_create):
        """Verify load_mcp_tools collects server_instructions from MCPClients."""
        mock_env_get.return_value = "/tmp/mcp.json"
        mock_exists.return_value = True

        import json

        mcp_config = {"mcpServers": {"test-server": {"command": "echo", "args": []}}}
        mock_open.return_value.__enter__ = lambda s: s
        mock_open.return_value.__exit__ = MagicMock(return_value=False)
        mock_open.return_value.read = MagicMock(return_value=json.dumps(mcp_config))

        mock_client = MagicMock()
        mock_client.list_tools_sync.return_value = []
        mock_client.server_instructions = "Always call init before generate."
        mock_create.return_value = ("test-server", mock_client)

        tm = ToolManager()
        tm.load_mcp_tools()

        assert len(tm.mcp_instructions) == 1
        assert "Always call init before generate." in tm.mcp_instructions[0]

    @patch("src.tools._create_mcp_client")
    @patch("src.tools.os.environ.get")
    @patch("src.tools.os.path.exists")
    @patch("builtins.open")
    def test_load_mcp_tools_skips_none_instructions(self, mock_open, mock_exists, mock_env_get, mock_create):
        """Verify load_mcp_tools skips servers without instructions."""
        mock_env_get.return_value = "/tmp/mcp.json"
        mock_exists.return_value = True

        import json

        mcp_config = {"mcpServers": {"no-inst": {"command": "echo", "args": []}}}
        mock_open.return_value.__enter__ = lambda s: s
        mock_open.return_value.__exit__ = MagicMock(return_value=False)
        mock_open.return_value.read = MagicMock(return_value=json.dumps(mcp_config))

        mock_client = MagicMock()
        mock_client.list_tools_sync.return_value = []
        mock_client.server_instructions = None
        mock_create.return_value = ("no-inst", mock_client)

        tm = ToolManager()
        tm.load_mcp_tools()

        assert len(tm.mcp_instructions) == 0
        assert tm.get_mcp_instructions() == ""
