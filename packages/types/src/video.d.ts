import { PrimaryKey } from './base';

export type GenerateVideoParams = {
  prompt: string;
  // モデルごとに固有のパラメータは以下
  // そのまま StartAsyncInvokeCommand に渡すもの
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any;
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
