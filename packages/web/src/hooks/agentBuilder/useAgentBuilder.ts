import { useState, useEffect } from 'react';
import {
  AgentConfiguration,
  CreateAgentRequest,
  UpdateAgentRequest,
  ListAgentsResponse,
} from 'generative-ai-use-cases';
import useAgentBuilderApi from './useAgentBuilderApi';

export const useAgentBuilder = (agentId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentConfiguration | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(
    new Set()
  );

  const api = useAgentBuilderApi();

  // Note: Zustand store removed in favor of SWR Infinite pattern

  // Create a new agent
  const createAgent = async (
    request: CreateAgentRequest
  ): Promise<AgentConfiguration> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.createAgent(request);
      return response.agent;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing agent
  const updateAgent = async (
    agentId: string,
    request: UpdateAgentRequest
  ): Promise<AgentConfiguration> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.updateAgent(agentId, request);
      return response.agent;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get a specific agent
  const getAgent = async (agentId: string): Promise<AgentConfiguration> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAgent(agentId);
      setAgent(response);
      return response;
    } catch (err: unknown) {
      let errorMessage = 'Failed to load agent';

      if (err) {
        errorMessage = 'Agent not found';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an agent
  const deleteAgent = async (agentId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteAgent(agentId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // List user's agents
  const listUserAgents = async (
    limit?: number,
    nextToken?: string
  ): Promise<ListAgentsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listUserAgents(limit, nextToken);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to list agents';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch public agents (for marketplace)
  const fetchPublicAgents = async (
    limit?: number,
    nextToken?: string
  ): Promise<ListAgentsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.fetchPublicAgents(limit, nextToken);
      console.log('fetchPublicAgents response:', response);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch public agents';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clone an agent
  const cloneAgent = async (
    agent: AgentConfiguration
  ): Promise<AgentConfiguration | null> => {
    setLoading(true);
    setError(null);
    try {
      const request = {
        sourceAgentId: agent.agentId,
        name: `${agent.name} (Cloned)`,
      };
      const response = await api.cloneAgent(request);
      return response.agent;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to clone agent';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load agent on mount if agentId is provided
  useEffect(() => {
    if (agentId) {
      console.log('Loading agent with ID:', agentId);
      const loadAgent = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await api.getAgent(agentId);
          console.log('Agent loaded successfully:', response);
          setAgent(response);
        } catch (err: unknown) {
          let errorMessage = 'Failed to load agent';

          if (err) {
            errorMessage = 'Agent not found';
            console.error(`Agent with ID ${agentId} not found`);
          } else if (err instanceof Error) {
            errorMessage = err.message;
            console.error('Failed to load agent:', err);
          }

          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      loadAgent();
    } else {
      // Clear agent when agentId is not provided
      setAgent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]); // Only depend on agentId, not api

  // List favorite agents
  const listFavoriteAgents = async (
    limit?: number,
    nextToken?: string
  ): Promise<ListAgentsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listFavoriteAgents(limit, nextToken);
      console.log('listFavoriteAgents response:', response);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch favorite agents';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle agent favorite
  const toggleAgentFavorite = async (
    agentId: string
  ): Promise<{ isFavorite: boolean }> => {
    // Use individual loading state for favorite operations
    setFavoriteLoading((prev) => new Set(prev).add(agentId));
    setError(null);
    try {
      const response = await api.toggleAgentFavorite(agentId);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle favorite';
      setError(errorMessage);
      throw err;
    } finally {
      setFavoriteLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
      });
    }
  };

  // Note: Enhanced list management operations moved to useAgentBuilderList hook

  return {
    // Basic agent operations
    loading,
    error,
    agent,
    favoriteLoading,
    createAgent,
    updateAgent,
    getAgent,
    deleteAgent,
    listUserAgents,
    fetchPublicAgents,
    cloneAgent,
    listFavoriteAgents,
    toggleAgentFavorite,
  };
};
