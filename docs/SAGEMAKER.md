# Amazon SageMaker のカスタムモデルを利用する場合

このソリューションでは Amazon Bedrock のほかに、Amazon SageMaker エンドポイントにデプロイされた大規模言語モデルを利用することが可能です。

Huggingface ID もしくは S3 URI を指定することで、Text Generation Inference (TGI) の Huggingface Container を使用した SageMaker Endpoint にモデルをデプロイします。利用するモデルはユーザーとアシスタントが交互に発言するチャット形式のプロンプトをサポートしているのが理想的です。

SageMaker Endpoint は複数モデルをデプロイすることができ、エンドポイントの起動/停止が可能です。またアクセスがない間の自動停止（デフォルトは1時間）にも対応しています。

**現在、画像生成ユースケースは Amazon SageMaker エンドポイントに対応していないので、ご注意ください。**

SageMake Endpoit は

## SageMaker エンドポイントを含めたソリューションのデプロイ

ソリューションデプロイ前に `packages/cdk/lib/construct/llm.ts` でデプロイしたいモデルを追加します。

```
// name は packages/cdk/lambda/utils/promptTemplates.ts でプロンプトテンプレート参照の際に利用される。
// (llama-2 のプロンプトであれば name に llama-2 が含まれるか確認する)
// HF_MODEL_ID は Huggingface ID か S3 URI が指定可能
const models: SageMakerModel[] = [
  {
    name: 'elyza-japanese-llama-2-7b-instruct',
    env: {
      ...DEFAULT_ENV,
      HF_MODEL_ID: 'elyza/ELYZA-japanese-Llama-2-7b-instruct',
    },
  },
];
```

## エンドポイントの起動・停止

エンドポイントの起動・停止はソリューションの設定画面（`/setting`）から行うことができます。

エンドポイントのデプロイにかかる時間はモデルのダウンロードにかかる時間に依存します。

エンドポイントデプロイが失敗した際は CloudWatch Logs を確認してください。

## エンドポイントの自動停止

デフォルトではエンドポイントの自動停止が有効化されていますが、無効化することも可能です。

無効化するには、`packages/cdk/cdk.json` の `autoDeleteEndpoint` を false にしてください。

## 各ユースケースでの SageMaker モデルの利用

SageMaker エンドポイントにデプロイしたモデルはデフォルトでチャットのみで利用できます。

ユースケースで利用する場合は、`packages/web/src/prompts/index.ts` を編集します。

各ユースケースの `supportedModels` にモデル名を追加し `generatePrompt` で既存のプロンプトを利用するか、モデルごとにプロンプトを設定することができます。
