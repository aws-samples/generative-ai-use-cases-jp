import { PrimaryKey } from './base';

export type TaskTypes = 'TEXT_VIDEO';

// https://docs.aws.amazon.com/ja_jp/nova/latest/userguide/video-gen-access.html
export type GenerateVideoParams = {
  taskType: TaskTypes;
  textToVideoParams: {
    text: string;
    // images (初期フレーム) は未対応
  };
  videoGenerationConfig: {
    durationSeconds: number;
    fps: number;
    dimension: string;
    seed: number;
  };
};

export type VideoJob = PrimaryKey & {
  jobId: string;
  invocationArn: string;
  // https://docs.aws.amazon.com/ja_jp/nova/latest/userguide/video-gen-access.html#video-gen-check-progress
  status: 'InProgress' | 'Completed' | 'Failed';
  output: string;
  modelId: string;
  prompt: string;
  durationSeconds: number;
  fps: number;
  dimension: string;
  seed: number;
};
