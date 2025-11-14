import { PrimaryKey } from './base';

export type ConversationType = 'chat' | 'assistant';

export type Chat = PrimaryKey & {
  chatId: string;
  usecase: string;
  title: string;
  updatedDate: string;
  conversationType?: ConversationType;
  assistantId?: string;
  assistantName?: string;
};
