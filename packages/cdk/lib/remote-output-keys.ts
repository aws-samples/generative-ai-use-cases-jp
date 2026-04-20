// Centralized Remote Output Keys to prevent typos and ensure consistency
// These keys match the CfnOutput logical names (not exportName)
export const REMOTE_OUTPUT_KEYS = {
  // Agent Stack
  AGENTS: 'Agents',

  // Agent Core Stack
  GENERIC_AGENT_CORE_RUNTIME_ARN: 'GenericAgentCoreRuntimeArn',
  GENERIC_AGENT_CORE_RUNTIME_NAME: 'GenericAgentCoreRuntimeName',
  AGENT_BUILDER_AGENT_CORE_RUNTIME_ARN: 'AgentBuilderAgentCoreRuntimeArn',
  AGENT_BUILDER_AGENT_CORE_RUNTIME_NAME: 'AgentBuilderAgentCoreRuntimeName',
  FILE_BUCKET_NAME: 'FileBucketName',

  // Research Agent Core Stack
  RESEARCH_AGENT_CORE_RUNTIME_ARN: 'ResearchAgentCoreRuntimeArn',
  RESEARCH_AGENT_CORE_RUNTIME_NAME: 'ResearchAgentCoreRuntimeName',
  RESEARCH_AGENT_FILE_BUCKET_NAME: 'ResearchAgentFileBucketName',
} as const;
