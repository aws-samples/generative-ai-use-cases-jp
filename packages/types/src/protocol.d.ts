import {
  Model,
  RecordedMessage,
  ToBeRecordedMessage,
  UnrecordedMessage,
} from './message';
import { Chat } from './chat';
import {
  QueryCommandOutput,
  RetrieveCommandOutput,
} from '@aws-sdk/client-kendra';
import { GenerateImageParams } from './image';
import { ShareId, UserIdAndChatId } from './share';
import { MediaFormat } from '@aws-sdk/client-transcribe';

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
  model?: Model;
  messages: UnrecordedMessage[];
};

export type PredictResponse = string;

export type PredictTitleRequest = {
  model: Model;
  chat: Chat;
  prompt: string;
};

export type PredictTitleResponse = string;

export type QueryKendraRequest = {
  query: string;
};

export type QueryKendraResponse = QueryCommandOutput;

export type RetrieveKendraRequest = {
  query: string;
};

export type RetrieveKendraResponse = RetrieveCommandOutput;

export type GetDocDownloadSignedUrlRequest = {
  bucketName: string;
  filePrefix: string;
  contentType?: string;
};

export type GetDocDownloadSignedUrlResponse = string;

export type GenerateImageRequest = {
  model?: Model;
  params: GenerateImageParams;
};
export type GenerateImageResponse = string;

export type GetMediaUploadSignedUrlRequest = {
  mediaFormat: MediaFormat;
};

export type GetMediaUploadSignedUrlResponse = string;

export type StartTranscriptionRequest = {
  audioUrl: string;
};

export type StartTranscriptionResponse = {
  jobName: string;
};

export type GetTranscriptionResponse = {
  status: string;
  transcript?: string;
};

export type UploadAudioRequest = {
  file: File;
};

export type WebTextRequest = {
  url: string;
};

export type WebTextResponse = {
  text: string;
};

export type CreateShareIdResponse = {
  shareId: ShareId;
  userIdAndChatId: UserIdAndChatId;
};

export type FindShareIdResponse = ShareId;

export type GetSharedChatResponse = {
  chat: Chat;
  messages: RecordedMessage[];
};

export type GetFileUploadSignedUrlRequest = {
  mediaFormat: string;
};

export type GetFileUploadSignedUrlResponse = string;

export type UploadFileRequest = {
  file: File;
};

export type RecognizeFileRequest = {
  fileUrl: string;
};

export type RecognizeFileResponse = {
  text: string;
};
