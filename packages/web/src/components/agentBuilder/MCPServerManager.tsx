import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiInfo, PiMagnifyingGlass, PiX } from 'react-icons/pi';
import { AvailableMCPServer } from 'generative-ai-use-cases';

interface MCPServerManagerProps {
  servers: string[];
  onChange: (servers: string[]) => void;
}

// Load MCP servers from environment variable
const loadMCPServersFromEnv = (): AvailableMCPServer[] => {
  try {
    const mcpConfig = import.meta.env.VITE_APP_MCP_SERVERS_CONFIG;
    if (!mcpConfig) {
      console.warn('VITE_APP_MCP_SERVERS_CONFIG not found, using fallback');
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

const MCPServerManager: React.FC<MCPServerManagerProps> = ({
  servers,
  onChange,
}) => {
  const { t } = useTranslation();
  const [selectedServers, setSelectedServers] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load available MCP servers from environment
  const AVAILABLE_MCP_SERVERS = useMemo(() => loadMCPServersFromEnv(), []);

  // Initialize selected servers from props
  useEffect(() => {
    setSelectedServers(new Set(servers));
  }, [servers]);

  // Handle server selection toggle
  const handleServerToggle = (serverName: string) => {
    const newSelected = new Set(selectedServers);
    if (newSelected.has(serverName)) {
      newSelected.delete(serverName);
    } else {
      newSelected.add(serverName);
    }
    setSelectedServers(newSelected);
    onChange(Array.from(newSelected));
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(AVAILABLE_MCP_SERVERS.map((server) => server.category))
    );
    return cats.sort();
  }, [AVAILABLE_MCP_SERVERS]);

  // Filter servers based on search query and selected category
  const filteredServers = useMemo(() => {
    return AVAILABLE_MCP_SERVERS.filter((server) => {
      const matchesSearch =
        searchQuery === '' ||
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || server.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [AVAILABLE_MCP_SERVERS, searchQuery, selectedCategory]);

  // Group filtered servers by category
  const serversByCategory = filteredServers.reduce(
    (acc, server) => {
      if (!acc[server.category]) {
        acc[server.category] = [];
      }
      acc[server.category].push(server);
      return acc;
    },
    {} as Record<string, AvailableMCPServer[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t('agent_builder.mcp_server_configuration')}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <PiInfo className="h-4 w-4" />
          {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
          <span>{selectedServers.size} selected</span>
        </div>
      </div>

      <div className="rounded-lg border bg-gray-50 p-4">
        <p className="mb-4 text-sm text-gray-600">
          {t('agent_builder.mcp_server_description')}
        </p>

        {/* Search and Filter Controls - Fixed at top */}
        <div className="sticky top-0 mb-4 space-y-3 bg-gray-50 pb-3">
          {/* Search Input */}
          <div className="relative">
            <PiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t(
                'agent_builder.search_mcp_servers',
                'Search MCP servers...'
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <PiX className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {t('agent_builder.all_categories', 'All')} (
              {AVAILABLE_MCP_SERVERS.length})
            </button>
            {categories.map((category) => {
              const count = AVAILABLE_MCP_SERVERS.filter(
                (s) => s.category === category
              ).length;
              return (
                /* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {AVAILABLE_MCP_SERVERS.length === 0 ? (
          <div className="rounded-md bg-yellow-50 p-3">
            <p className="text-sm text-yellow-700">
              {t(
                'agent_builder.no_mcp_servers_available',
                'No MCP servers are currently available.'
              )}
            </p>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="rounded-md bg-yellow-50 p-3">
            <p className="text-sm text-yellow-700">
              {searchQuery || selectedCategory !== 'all'
                ? t(
                    'agent_builder.no_mcp_servers_match_filter',
                    'No MCP servers match your current filter.'
                  )
                : t(
                    'agent_builder.no_mcp_servers_available',
                    'No MCP servers are currently available.'
                  )}
            </p>
          </div>
        ) : (
          <div className="scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 max-h-96 overflow-y-auto pr-2">
            {Object.entries(serversByCategory).length > 0 &&
              Object.entries(serversByCategory).map(
                ([category, categoryServers]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="sticky top-0 mb-3 flex items-center gap-2 bg-gray-50 py-2 text-sm font-medium text-gray-700">
                      <span>{category}</span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        {categoryServers.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {categoryServers.map((server) => (
                        <label
                          key={server.name}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedServers.has(server.name)}
                            onChange={() => handleServerToggle(server.name)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-gray-900">
                                {server.name}
                              </div>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                {server.category}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {server.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              )}

            {selectedServers.size === 0 && (
              <div className="sticky bottom-0 mt-4 rounded-md bg-blue-50 p-3">
                <p className="text-sm text-blue-700">
                  {t(
                    'agent_builder.no_mcp_servers_selected',
                    'No MCP servers selected. Your agent will have basic functionality only.'
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPServerManager;
