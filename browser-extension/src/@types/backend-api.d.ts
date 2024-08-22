import { SystemContext } from './chat';

export type PrimaryKey = {
  id: string;
  createdDate: string;
};

export type CreateSystemContextRequest = {
  systemContext: PrimaryKey & SystemContext;
};

export type GetSystemContextsRequest = (PrimaryKey & SystemContext)[];

export type StreamingChunk = {
  text: string;
  stopReason?: string;
};
