import {
  AgentConfiguration,
  CreateAgentRequest,
  CreateAgentResponse,
  UpdateAgentRequest,
  UpdateAgentResponse,
  ListAgentsResponse,
  DeleteAgentResponse,
  CloneAgentRequest,
  CloneAgentResponse,
  ToggleFavoriteResponse,
} from 'generative-ai-use-cases';
import useHttp from '../useHttp';

const useAgentBuilderApi = () => {
  const http = useHttp();

  // SWR Infinite configuration functions
  const listUserAgentsSWR = () => {
    return {
      key: (pageIndex: number, previousPageData: ListAgentsResponse | null) => {
        if (previousPageData && !previousPageData.nextToken) return null;
        const params = new URLSearchParams();
        params.append('limit', '12');
        if (pageIndex > 0 && previousPageData?.nextToken) {
          params.append('nextToken', previousPageData.nextToken);
        }
        return `agents/my?${params.toString()}`;
      },
      fetcher: async (url: string): Promise<ListAgentsResponse> => {
        try {
          const res = await http.api.get(url);
          return {
            ...res.data,
            data: res.data.agents,
            lastEvaluatedKey: res.data.nextToken,
          };
        } catch (error) {
          return {
            agents: [],
            data: [],
            nextToken: undefined,
            lastEvaluatedKey: undefined,
            totalCount: undefined,
            type: 'my',
          };
        }
      },
    };
  };

  const listFavoriteAgentsSWR = () => {
    return {
      key: (pageIndex: number, previousPageData: ListAgentsResponse | null) => {
        if (previousPageData && !previousPageData.nextToken) return null;
        const params = new URLSearchParams();
        params.append('limit', '12');
        if (pageIndex > 0 && previousPageData?.nextToken) {
          params.append('nextToken', previousPageData.nextToken);
        }
        return `agents/favorites?${params.toString()}`;
      },
      fetcher: async (url: string): Promise<ListAgentsResponse> => {
        const res = await http.api.get(url);
        return {
          ...res.data,
          data: res.data.agents,
          lastEvaluatedKey: res.data.nextToken,
        };
      },
    };
  };

  const fetchPublicAgentsSWR = () => {
    return {
      key: (pageIndex: number, previousPageData: ListAgentsResponse | null) => {
        if (previousPageData && !previousPageData.nextToken) return null;
        const params = new URLSearchParams();
        params.append('limit', '12');
        if (pageIndex > 0 && previousPageData?.nextToken) {
          params.append('nextToken', previousPageData.nextToken);
        }
        return `agents/public?${params.toString()}`;
      },
      fetcher: async (url: string): Promise<ListAgentsResponse> => {
        const res = await http.api.get(url);
        return {
          ...res.data,
          data: res.data.agents,
          lastEvaluatedKey: res.data.nextToken,
        };
      },
    };
  };

  return {
    // Agent CRUD operations
    createAgent: async (
      req: CreateAgentRequest
    ): Promise<CreateAgentResponse> => {
      const res = await http.post<AgentConfiguration>('agents', req);
      return { agent: res.data };
    },

    updateAgent: async (
      agentId: string,
      req: UpdateAgentRequest
    ): Promise<UpdateAgentResponse> => {
      const res = await http.put<AgentConfiguration>(
        `agents/${encodeURIComponent(agentId)}`,
        req
      );
      return { agent: res.data };
    },

    getAgent: async (agentId: string): Promise<AgentConfiguration> => {
      const res = await http.api.get(`agents/${encodeURIComponent(agentId)}`);
      return res.data;
    },

    deleteAgent: async (agentId: string): Promise<DeleteAgentResponse> => {
      const res = await http.delete<DeleteAgentResponse>(
        `agents/${encodeURIComponent(agentId)}`
      );
      return res.data;
    },

    // Agent listing operations
    listUserAgents: async (
      limit?: number,
      nextToken?: string
    ): Promise<ListAgentsResponse> => {
      try {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (nextToken) params.append('nextToken', nextToken);

        const queryString = params.toString();
        const endpoint = queryString ? `agents/my?${queryString}` : 'agents/my';
        const res = await http.api.get(endpoint);
        return res.data;
      } catch (error) {
        return {
          agents: [],
          nextToken: undefined,
          totalCount: undefined,
          type: 'my',
        };
      }
    },

    listFavoriteAgents: async (
      limit?: number,
      nextToken?: string
    ): Promise<ListAgentsResponse> => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (nextToken) params.append('nextToken', nextToken);

      const queryString = params.toString();
      const endpoint = queryString
        ? `agents/favorites?${queryString}`
        : 'agents/favorites';

      const res = await http.api.get(endpoint);
      return res.data;
    },

    fetchPublicAgents: async (
      limit?: number,
      nextToken?: string
    ): Promise<ListAgentsResponse> => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (nextToken) params.append('nextToken', nextToken);

      const queryString = params.toString();
      const endpoint = queryString
        ? `agents/public?${queryString}`
        : 'agents/public';

      const res = await http.api.get(endpoint);
      return res.data;
    },

    // SWR Infinite methods
    listUserAgentsSWR,
    listFavoriteAgentsSWR,
    fetchPublicAgentsSWR,

    // Agent operations
    cloneAgent: async (req: CloneAgentRequest): Promise<CloneAgentResponse> => {
      const res = await http.post<AgentConfiguration>('agents/clone', req);
      return { success: true, agent: res.data };
    },

    toggleAgentFavorite: async (
      agentId: string
    ): Promise<ToggleFavoriteResponse> => {
      const res = await http.post<ToggleFavoriteResponse>(
        `agents/${encodeURIComponent(agentId)}/favorite`,
        {}
      );
      return res.data;
    },
  };
};

export default useAgentBuilderApi;
