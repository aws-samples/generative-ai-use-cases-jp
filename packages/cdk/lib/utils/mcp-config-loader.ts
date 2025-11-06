import * as fs from 'fs';

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
 * Load MCP configuration from specified file path
 */
export function loadMCPConfig(
  filePath: string
): Record<string, MCPServerConfig> {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(
        `MCP file not found: ${filePath}, using empty configuration`
      );
      return {};
    }

    const mcpConfig: MCPConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return mcpConfig.mcpServers || {};
  } catch (error) {
    console.error(`Error loading MCP configuration from ${filePath}:`, error);
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
