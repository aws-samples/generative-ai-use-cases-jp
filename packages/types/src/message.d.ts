import { PrimaryKey } from './base';

export type Role = 'system' | 'user' | 'assistant';

export type MessageAttributes = {
  messageId: string;
  usecase: string;
  userId: string;
  feedback: string;
  llmType: string;
};

export type UnrecordedMessage = {
  role: Role;
  content: string;
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
