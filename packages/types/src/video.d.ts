import { PrimaryKey } from './base';
import { DocumentType } from '@smithy/types';

export type GenerateVideoParams = {
  prompt: string;
  // モデルごとに固有のパラメータは以下
  // そのまま StartAsyncInvokeCommand に渡すもの
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
