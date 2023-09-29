import {
  RecordedMessage,
  ShownMessage,
  ToBeRecordedMessage,
  UnrecordedMessage,
} from './message';
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

export type FindChatByIdResponse = {
  chat: Chat;
};

export type ListMessagesResponse = {
  messages: RecordedMessage[];
};

export type UpdateFeedbackRequest = {
  createdDate: string;
  feedback: string;
};

export type UpdateFeedbackResponse = {
  message: RecordedMessage;
};

export type UpdateTitleRequest = {
  title: string;
};

export type UpdateTitleResponse = {
  chat: Chat;
};

export type PredictRequest = {
  messages: UnrecordedMessage[];
};

export type PredictResponse = {
  completion: string;
  stop_reason: string;
};

export type PredictTitleRequest = {
  chat: Chat;
  messages: UnrecordedMessage[];
};

export type PredictTitleResponse = string;
