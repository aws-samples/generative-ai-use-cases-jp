/**
 * Sanitizes model ID to be compatible with CloudFormation export names
 * Replaces invalid characters with hyphens
 */
export const sanitizeModelId = (modelId: string): string => {
  return modelId.replace(/[^a-zA-Z0-9-]/g, '-');
};
