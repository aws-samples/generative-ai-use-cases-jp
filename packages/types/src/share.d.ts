import { PrimaryKey } from './base';

export type ShareId = PrimaryKey & {
  shareId: string;
};

export type UserIdAndChatId = PrimaryKey & {
  userId: string;
  chatId: string;
};
