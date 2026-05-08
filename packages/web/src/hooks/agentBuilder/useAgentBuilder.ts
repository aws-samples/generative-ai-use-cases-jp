import { useState, useEffect } from 'react';
import { AgentConfiguration } from 'generative-ai-use-cases';
import useAgentBuilderApi from './useAgentBuilderApi';

export const useAgentBuilder = (agentId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentConfiguration | null>(null);

  const api = useAgentBuilderApi();

  // Note: Zustand store removed in favor of SWR Infinite pattern

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

  return {
    // Single agent state management
    loading,
    error,
    agent,
    getAgent,
  };
};
