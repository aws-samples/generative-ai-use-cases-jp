import * as cdk from 'aws-cdk-lib';
import { StackInput, stackInputSchema } from './lib/stack-input';

// CDK Context からパラメータを取得する場合
const getContext = (app: cdk.App): StackInput => {
  const params = stackInputSchema.parse(app.node.getAllContext());
  return params;
};

// パラメータを直接定義する場合
const envs: Record<string, StackInput> = {
  // 必要に応じて以下をカスタマイズ
  dev: stackInputSchema.parse({
    // 開発環境のパラメータ
    env: 'dev',
  }),
  staging: stackInputSchema.parse({
    // ステージング環境のパラメータ
    env: 'staging',
  }),
  prod: stackInputSchema.parse({
    // 本番環境のパラメータ
    env: 'prod',
  }),
  // 他環境も必要に応じてカスタマイズ
};

// 後方互換性のため、CDK Context > parameter.ts の順でパラメータを取得する
export const getParams = (app: cdk.App): StackInput => {
  // デフォルトでは CDK Context からパラメータを取得する
  let params = getContext(app);

  // env が envs で定義したものにマッチ場合は、envs のパラメータを context よりも優先して使用する
  if (envs[params.env]) {
    params = envs[params.env];
  }

  return params;
};
