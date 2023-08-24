import { RecordedMessage, UnrecordedMessage, ShownMessage } from './message';
import { Chat } from './chat';

export type CreateChatRequest = {
  systemContext?: UnrecordedMessage;
};

export type CreateChatResponse = {
  chat: Chat;
  systemContext?: RecordedMessage;
};

export type ListChatsResponse = {
  chats: Chat[];
};

export type ListMessagesResponse = {
  messages: RecordedMessage[];
};

export type PredictRequest = {
  chatId?: string;
  recordedMessages: RecordedMessage[];
  unrecordedMessages: UnrecordedMessage[];
  skipRecording?: boolean;
};

export type PredictResponse = {
  messages: ShownMessage[];
};
