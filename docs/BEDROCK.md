# Amazon Bedrock の違うモデルを利用したい場合

このソリューションはデフォルトで `us-east-1` の `anthropic.claude-v2` を利用しています。

CDK Deploy 時のパラメータもしくは `packages/cdk/cdk.json` で Context として指定することでリージョン、モデル、プロンプトを変更することが可能です。

```bash
npm run cdk:deploy -- -c modelRegion=<Region> -c modelName=<Model Name> -c promptTemplate=<Prompt Tempalte File>
```

promptTemplate はプロンプトを構築するためのテンプレートを JSON にしたファイル名を指定します。 (例: `llama2.json`)
プロンプトテンプレートの例は `prompt-templates` フォルダを参照してください。

## デプロイの例

**ap-northeast-1 (東京) の Amazon Bedrock Claude Instant を利用する**

> **現状、モデルのリージョン (modelRegion) として 東京 (ap-northeast-1) を指定した場合、画像生成のユースケースは動作しません。東京リージョンの Amazon Bedrock で Stable Diffusion XL モデルがサポートされ次第、利用可能になります。**

```bash
npm run cdk:deploy -- -c modelRegion=ap-northeast-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```

**us-east-1 (バージニア) の Amazon Bedrock Claude Instant を利用する**

```bash
npm run cdk:deploy -- -c modelRegion=us-east-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```
