import { PrimaryKey } from './base';

export type Role = 'system' | 'user' | 'assistant';

export type Model = {
  type: 'bedrock' | 'bedrockAgent' | 'sagemaker';
  modelId: string;
  sessionId?: string;
};

export type Agent = {
  displayName: string;
  agentId: string;
  aliasId: string;
};

export type AgentMap = Record<string, { agentId: string; aliasId: string }>;

export type MessageAttributes = {
  messageId: string;
  usecase: string;
  userId: string;
  feedback: string;
};

export type UnrecordedMessage = {
  role: Role;
  content: string;
  llmType?: string;
};

export type RecordedMessage = PrimaryKey &
  MessageAttributes &
  UnrecordedMessage;

export type ToBeRecordedMessage = UnrecordedMessage & {
  messageId: string;
  usecase: string;
};

export type ShownMessage = Partial<PrimaryKey> &
  Partial<MessageAttributes> &
  UnrecordedMessage;

export type DocumentComment = {
  excerpt: string;
  replace?: string;
  comment?: string;
};
