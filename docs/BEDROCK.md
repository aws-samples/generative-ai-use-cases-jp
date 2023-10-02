# Amazon Bedrock を利用する場合

このソリューションではデフォルトでは `us-east-1` の `anthropic.claude-v2` を利用しています。

CDK Deploy 時のパラメータもしくは `packages/cdk/cdk.json` で Context として指定することでリージョン、モデル、プロンプトを変更することが可能です。

```bash
npm run cdk:deploy -- -c modelRegion=<Region> -c modelName=<Model Name> -c promptTemplate=<Prompt Tempalte File>
```

promptTemplate はプロンプトを構築するためのテンプレートを JSON にしたファイル名を指定します。 (例: `llama2.json`)
プロンプトテンプレートの例は `prompt_templates` フォルダを参照してください。

## デプロイの例

**Claude Instant**

```bash
npm run cdk:deploy -- -c modelRegion=us-east-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```
