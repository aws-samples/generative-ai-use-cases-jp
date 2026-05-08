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

  // Application Inference Profile Stack
  INFERENCE_PROFILE_ARNS: 'InferenceProfileArns',
} as const;

// No longer needed - inference profiles are now in a single JSON output
// export const getInferenceProfileOutputKey = (sanitizedModelId: string) =>
//   `InferenceProfile-${sanitizedModelId}-Arn`;
