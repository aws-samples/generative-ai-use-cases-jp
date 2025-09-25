import * as fs from 'fs';
import * as path from 'path';

export interface MCPServerMetadata {
  category?: string;
  description?: string;
}

export interface MCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  metadata?: MCPServerMetadata;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * Load MCP configuration from mcp.json file
 * Returns only the server names and metadata for frontend use
 */
export function loadMCPConfig(): Record<string, MCPServerConfig> {
  try {
    const mcpJsonPath = path.join(
      __dirname,
      '../../lambda-python/generic-agent-core-runtime/mcp.json'
    );

    if (!fs.existsSync(mcpJsonPath)) {
      console.warn('mcp.json not found, using empty configuration');
      return {};
    }

    const mcpConfig: MCPConfig = JSON.parse(
      fs.readFileSync(mcpJsonPath, 'utf8')
    );
    return mcpConfig.mcpServers || {};
  } catch (error) {
    console.error('Error loading MCP configuration:', error);
    return {};
  }
}

/**
 * Extract safe MCP server information for frontend
 * Excludes sensitive information like commands, args, and env variables
 */
export function extractSafeMCPConfig(
  mcpServers: Record<string, MCPServerConfig>
): string {
  const safeConfig: Record<string, { metadata?: MCPServerMetadata }> = {};

  Object.keys(mcpServers).forEach((serverName) => {
    const serverConfig = mcpServers[serverName];
    safeConfig[serverName] = {
      metadata: serverConfig.metadata,
    };
  });

  return JSON.stringify(safeConfig);
}
