# Amazon Bedrock を利用する場合

CDK Deploy 時のパラメータもしくは `packages/cdk/cdk.json` で Context として指定することでリージョン、モデル、プロンプトを変更することが可能です。

```bash
npm run cdk:deploy -- -c modelRegion=<Region> -c modelName=<Model Name> -c promptTemplate=<prompt_template_file>
```

promptTemplate はプロンプトを構築するためのテンプレートを JSON にしたファイル名を指定します。 (例: `llama2.json`)
プロンプトテンプレートの例は `prompt_templates` フォルダを参照してください。
