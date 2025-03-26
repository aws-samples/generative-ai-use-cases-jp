import { PrimaryKey } from './base';
import { DocumentType } from '@smithy/types';

export type GenerateVideoParams = {
  prompt: string;
  // Parameters specific to each model are as follows
  // Pass them directly to StartAsyncInvokeCommand
  params: DocumentType;
};

export type VideoJob = PrimaryKey & {
  jobId: string;
  invocationArn: string;
  // https://docs.aws.amazon.com/ja_jp/nova/latest/userguide/video-gen-access.html#video-gen-check-progress
  status: 'InProgress' | 'Completed' | 'Failed';
  output: string;
  modelId: string;
  region: string;
  prompt: string;
  params: string;
};
