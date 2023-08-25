import { RecordedMessage, ShownMessage, ToBeRecordedMessage } from './message';
import { Chat } from './chat';

export type CreateChatResponse = {
  chat: Chat;
};

export type CreateMessagesRequest = {
  messages: ToBeRecordedMessage[];
};

export type CreateMessagesResponse = {
  messages: RecordedMessage[];
};

export type ListChatsResponse = {
  chats: Chat[];
};

export type ListMessagesResponse = {
  messages: RecordedMessage[];
};

export type PredictRequest = {
  messages: ShownMessage[];
};

export type PredictResponse = string;
