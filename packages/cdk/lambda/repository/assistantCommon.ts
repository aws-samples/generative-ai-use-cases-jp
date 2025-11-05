/**
 * Assistant Repository Common Utilities
 * Provides shared utilities for assistant and assistant message repositories
 */

/**
 * Format assistant from DynamoDB item to API response format
 */
export function formatAssistantFromDb(item: any): any {
  return {
    assistantId: item.assistantId.replace('assistant#', ''),
    userId: item.userId.replace('user#', ''),
    name: item.name,
    description: item.description,
    instruction: item.instruction,
    modelId: item.modelId,
    ragEnabled: item.ragEnabled,
    syncStatus: item.syncStatus,
    syncStatusReason: item.syncStatusReason,
    knowledgeSources: item.knowledgeSources || [],
    s3Urls: item.s3Urls || [],
    createdDate: item.createdDate,
    updatedDate: item.updatedDate,
  };
}

/**
 * Format assistant message from DynamoDB item to API response format
 */
export function formatMessageFromDb(item: any): any {
  const messageId = item.messageId.split('#')[1]; // Extract UUID from "<timestamp>#<uuid>"

  return {
    messageId,
    assistantId: item.assistantId.replace('assistant#', ''),
    userId: item.userId.replace('user#', ''),
    role: item.role,
    content: item.content,
    sources: item.sources,
    metadata: item.metadata,
    createdDate: item.createdDate,
  };
}
