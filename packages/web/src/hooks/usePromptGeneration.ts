/**
 * usePromptGeneration Hook
 *
 * A custom hook for generating AI agent system prompts using LLM streaming.
 * Also automatically selects appropriate MCP servers based on the agent description.
 */

import { useState, useCallback, useRef } from 'react';
import { AvailableMCPServer } from 'generative-ai-use-cases';
import useChatApi from './useChatApi';
import { parseStreamChunk, extractTextFromChunks } from '../utils/streamParser';
import {
  buildAgentSystemPromptGeneratorPrompt,
  MCP_SERVERS_START_MARKER,
  MCP_SERVERS_END_MARKER,
  SYSTEM_PROMPT_START_MARKER,
  SYSTEM_PROMPT_END_MARKER,
} from '../prompts/agentSystemPromptGenerator';

export interface UsePromptGenerationParams {
  modelId: string;
  agentName: string;
  agentDescription: string;
  availableMCPServers: AvailableMCPServer[];
}

export interface UsePromptGenerationReturn {
  generatedPrompt: string;
  suggestedMCPServers: string[];
  isGenerating: boolean;
  error: Error | null;
  generate: () => Promise<string>;
  cancel: () => void;
  reset: () => void;
}

/**
 * Parses MCP server names from the raw output between markers.
 *
 * @param rawOutput - The accumulated raw output from the LLM
 * @returns Array of MCP server names, or null if markers not yet complete
 */
const parseMCPServers = (rawOutput: string): string[] | null => {
  const startIndex = rawOutput.indexOf(MCP_SERVERS_START_MARKER);
  const endIndex = rawOutput.indexOf(MCP_SERVERS_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const content = rawOutput.slice(
    startIndex + MCP_SERVERS_START_MARKER.length,
    endIndex
  );

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

/**
 * Extracts the system prompt content from raw output, handling streaming.
 *
 * @param rawOutput - The accumulated raw output from the LLM
 * @returns The extracted system prompt (may be partial during streaming)
 */
const extractSystemPrompt = (rawOutput: string): string => {
  const startIndex = rawOutput.indexOf(SYSTEM_PROMPT_START_MARKER);

  if (startIndex === -1) {
    return '';
  }

  const contentStart = startIndex + SYSTEM_PROMPT_START_MARKER.length;
  const endIndex = rawOutput.indexOf(SYSTEM_PROMPT_END_MARKER, contentStart);

  if (endIndex === -1) {
    // Still streaming - return content after start marker
    return rawOutput.slice(contentStart).trimStart();
  }

  // Complete - return content between markers
  return rawOutput.slice(contentStart, endIndex).trim();
};

/**
 * Custom hook for generating system prompts using AI.
 * Also suggests appropriate MCP servers based on the agent's purpose.
 *
 * @param params - Generation parameters including model ID and agent info
 * @returns Object containing generation state and control functions
 */
export const usePromptGeneration = (
  params: UsePromptGenerationParams
): UsePromptGenerationReturn => {
  const { modelId, agentName, agentDescription, availableMCPServers } = params;
  const { predictStream } = useChatApi();

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [suggestedMCPServers, setSuggestedMCPServers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mcpServersParsedRef = useRef(false);

  /**
   * Generates a system prompt using the LLM.
   * Updates generatedPrompt and suggestedMCPServers states as chunks are received.
   *
   * @returns The complete generated prompt
   */
  const generate = useCallback(async (): Promise<string> => {
    setIsGenerating(true);
    setError(null);
    setGeneratedPrompt('');
    setSuggestedMCPServers([]);
    mcpServersParsedRef.current = false;
    abortControllerRef.current = new AbortController();

    let rawOutput = '';

    try {
      // Build the prompt with available MCP servers
      const prompt = buildAgentSystemPromptGeneratorPrompt({
        name: agentName,
        description: agentDescription,
        availableMCPServers:
          availableMCPServers.length > 0 ? availableMCPServers : undefined,
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
          rawOutput += text;

          // Try to parse MCP servers once we have the complete section
          if (!mcpServersParsedRef.current) {
            const servers = parseMCPServers(rawOutput);
            if (servers !== null) {
              setSuggestedMCPServers(servers);
              mcpServersParsedRef.current = true;
            }
          }

          // Extract and update system prompt (streaming)
          const systemPrompt = extractSystemPrompt(rawOutput);
          if (systemPrompt) {
            setGeneratedPrompt(systemPrompt);
          }
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

    // Return the final extracted prompt
    return extractSystemPrompt(rawOutput);
  }, [
    modelId,
    agentName,
    agentDescription,
    availableMCPServers,
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
    setSuggestedMCPServers([]);
    setError(null);
    setIsGenerating(false);
    mcpServersParsedRef.current = false;
  }, []);

  return {
    generatedPrompt,
    suggestedMCPServers,
    isGenerating,
    error,
    generate,
    cancel,
    reset,
  };
};

export default usePromptGeneration;
