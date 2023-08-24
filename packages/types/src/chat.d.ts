import { PrimaryKey } from './base';

export type Chat = PrimaryKey & {
  chatId: string;
  usecase: string;
  title: string;
  updatedDate: string;
};
