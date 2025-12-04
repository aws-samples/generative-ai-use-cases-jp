/**
 * usePromptGeneration Hook
 *
 * A custom hook for generating AI agent system prompts using LLM streaming.
 */

import { useState, useCallback, useRef } from 'react';
import { AvailableMCPServer } from 'generative-ai-use-cases';
import useChatApi from './useChatApi';
import { parseStreamChunk, extractTextFromChunks } from '../utils/streamParser';
import {
  buildAgentSystemPromptGeneratorPrompt,
  formatMCPServersInfo,
} from '../prompts/agentSystemPromptGenerator';

export interface UsePromptGenerationParams {
  modelId: string;
  agentName: string;
  agentDescription: string;
  mcpServers: string[];
  mcpServerConfigs: AvailableMCPServer[];
}

export interface UsePromptGenerationReturn {
  generatedPrompt: string;
  isGenerating: boolean;
  error: Error | null;
  generate: () => Promise<string>;
  cancel: () => void;
  reset: () => void;
}

/**
 * Custom hook for generating system prompts using AI.
 *
 * @param params - Generation parameters including model ID and agent info
 * @returns Object containing generation state and control functions
 */
export const usePromptGeneration = (
  params: UsePromptGenerationParams
): UsePromptGenerationReturn => {
  const { modelId, agentName, agentDescription, mcpServers, mcpServerConfigs } =
    params;
  const { predictStream } = useChatApi();

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Generates a system prompt using the LLM.
   * Updates generatedPrompt state as chunks are received.
   *
   * @returns The complete generated prompt
   */
  const generate = useCallback(async (): Promise<string> => {
    setIsGenerating(true);
    setError(null);
    setGeneratedPrompt('');
    abortControllerRef.current = new AbortController();

    let result = '';

    try {
      // Build MCP server info for the prompt
      const selectedMCPServers = mcpServers
        .map((serverName) => {
          const server = mcpServerConfigs.find((s) => s.name === serverName);
          return server || { name: serverName, description: serverName };
        })
        .filter(Boolean);

      const mcpServersInfo =
        selectedMCPServers.length > 0
          ? formatMCPServersInfo(selectedMCPServers)
          : undefined;

      // Build the prompt
      const prompt = buildAgentSystemPromptGeneratorPrompt({
        name: agentName,
        description: agentDescription,
        mcpServersInfo,
      });

      // Stream the response
      for await (const chunk of predictStream({
        model: {
          type: 'bedrock',
          modelId,
        },
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        id: crypto.randomUUID(),
      })) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        // Parse the chunk and extract text
        const chunkStr = chunk as string;
        const parsedChunks = parseStreamChunk(chunkStr);
        const text = extractTextFromChunks(parsedChunks);

        if (text) {
          result += text;
          setGeneratedPrompt(result);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error generating system prompt:', err);
        setError(err);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }

    return result;
  }, [
    modelId,
    agentName,
    agentDescription,
    mcpServers,
    mcpServerConfigs,
    predictStream,
  ]);

  /**
   * Cancels an in-progress generation.
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  }, []);

  /**
   * Resets the generation state.
   */
  const reset = useCallback(() => {
    setGeneratedPrompt('');
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    generatedPrompt,
    isGenerating,
    error,
    generate,
    cancel,
    reset,
  };
};

export default usePromptGeneration;
