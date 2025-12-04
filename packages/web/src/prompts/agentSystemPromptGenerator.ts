/**
 * Agent System Prompt Generator
 *
 * Template for generating system prompts for AI agents using LLM.
 */

export interface AgentPromptParams {
  name: string;
  description: string;
  mcpServersInfo?: string;
}

/**
 * Builds the prompt template for generating an AI agent's system prompt.
 *
 * @param params - Agent information including name, description, and MCP servers
 * @returns The formatted prompt string to send to the LLM
 */
export const buildAgentSystemPromptGeneratorPrompt = (
  params: AgentPromptParams
): string => {
  const { name, description, mcpServersInfo } = params;

  return `You are an expert in creating system prompts for AI agents.
Based on the following information, generate an optimal system prompt for this agent.

## Agent Information
- Name: ${name}
- Description: ${description}
${mcpServersInfo ? `- Available MCP Servers (Tools):\n${mcpServersInfo}` : ''}

## Requirements
1. Clearly define the role and purpose of the agent
2. Describe the personality and behavior the agent should have
3. If MCP servers are available, include how to effectively utilize those tools
4. Include guidelines for interaction with users
5. List any constraints or important notes

Output only the system prompt. No explanations or preambles.`;
};

/**
 * Formats MCP server information for inclusion in the prompt.
 *
 * @param servers - Array of server objects with name and description
 * @returns Formatted string of MCP server information
 */
export const formatMCPServersInfo = (
  servers: { name: string; description: string }[]
): string => {
  return servers
    .map((server) => `- ${server.name}: ${server.description}`)
    .join('\n');
};
