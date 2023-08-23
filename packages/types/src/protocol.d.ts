import { RecordedMessage, UnrecordedMessage, ShownMessage } from './message';
import { Chat } from './chat';

export type CreateChatRequest = {
  unrecordedMessages: UnrecordedMessage[];
};

export type CreateChatResponse = {
  chat: Chat;
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
