import { PrimaryKey } from './base';

export type FindShareId = PrimaryKey & {
  shareId: string;
};

export type FindUserIdAndChatId = PrimaryKey & {
  userId: string;
  chatId: string;
};
