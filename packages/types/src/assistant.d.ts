export type KnowledgeSource = {
  id: string;
  type: 'file' | 'web';
  displayName: string;
  storageKey?: string; // S3 key for files
  sourceUrl?: string; // Original URL for web
  status: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED';
  error?: string;
};

export type Assistant = {
  id: string; // userId - partition key
  createdDate: string; // sort key
  assistantId: string;
  userId: string; // Duplicate for clarity, same as id
  name: string;
  description: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  syncStatus: 'QUEUED' | 'SYNCING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
  syncStatusReason: string;
  knowledgeSources: KnowledgeSource[];
  s3Urls?: string[]; // Deprecated - for backward compatibility during migration
  updatedDate: string;
};

export type AssistantMessage = {
  id: string; // assistantId - partition key
  createdDate: string; // Derived from messageId timestamp
  messageId: string; // sort key: timestamp#uuid
  assistantId: string; // Duplicate for clarity, same as id
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AssistantMessageSource[];
  metadata?: {
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
};

export type AssistantMessageSource = {
  sourceId: string;
  sourceType: 'file' | 'web';
  content: string;
  contentType: string;
  excerpt: string;
  sourceUrl?: string; // Original URL for web sources
  storageKey?: string; // S3 key for file sources
  s3Url?: string; // Deprecated - for backward compatibility
};

export type CreateAssistantRequest = {
  name: string;
  description: string;
  instruction: string;
  modelId: string;
  ragEnabled: boolean;
  knowledgeSources?: KnowledgeSource[];
  s3Urls?: string[]; // Deprecated - for backward compatibility
};

export type UpdateAssistantRequest = {
  name?: string;
  description?: string;
  instruction?: string;
  modelId?: string;
  ragEnabled?: boolean;
  knowledgeSources?: KnowledgeSource[];
  s3Urls?: string[]; // Deprecated - for backward compatibility
};

export type CreateAssistantMessageRequest = {
  content: string;
};

export type ListAssistantsResponse = {
  assistants: Assistant[];
  lastEvaluatedKey?: string;
};

export type ListAssistantMessagesResponse = {
  messages: AssistantMessage[];
  lastEvaluatedKey?: string;
}
