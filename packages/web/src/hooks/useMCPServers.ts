/**
 * useMCPServers Hook
 *
 * Provides MCP server configuration loaded from environment variables.
 * Consolidates the logic previously duplicated in AgentForm and MCPServerManager.
 */

import { useMemo } from 'react';
import { AvailableMCPServer } from 'generative-ai-use-cases';

/**
 * Loads MCP servers configuration from the VITE_APP_MCP_SERVERS_CONFIG environment variable.
 *
 * @returns Array of available MCP servers with name, description, and category
 */
export const loadMCPServersFromEnv = (): AvailableMCPServer[] => {
  try {
    const mcpConfig = import.meta.env.VITE_APP_MCP_SERVERS_CONFIG;
    if (!mcpConfig) {
      console.warn('VITE_APP_MCP_SERVERS_CONFIG not found');
      return [];
    }

    const parsedConfig = JSON.parse(mcpConfig);
    return Object.keys(parsedConfig).map((serverName) => {
      const metadata = parsedConfig[serverName]?.metadata || {};
      return {
        name: serverName,
        description: metadata.description || `MCP server: ${serverName}`,
        category: metadata.category || 'Other',
      };
    });
  } catch (error) {
    console.error('Error parsing MCP servers config:', error);
    return [];
  }
};

/**
 * Custom hook that provides memoized MCP server configurations.
 *
 * @returns Memoized array of available MCP servers
 */
export const useMCPServers = (): AvailableMCPServer[] => {
  return useMemo(() => loadMCPServersFromEnv(), []);
};

export default useMCPServers;
