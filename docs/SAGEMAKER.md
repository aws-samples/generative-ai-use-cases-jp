# SageMaker のカスタムモデルを利用する場合

大規模言語モデルとして　Amazon SageMaker エンドポイントにデプロイされたモデルを利用することが可能です。

Text Generation Inference (TGI) を使用した Huggingface Container を使用した SageMaker Endpoint に対応しています。Falcon をデプロイする際の例は[こちら](https://github.com/aws-samples/sagemaker-hosting/blob/main/GenAI-Hosting/Large-Language-Model-Hosting/LLM-Streaming/Falcon-40b-and-7b/falcon-40b-and-7b-tgi-streaming/falcon-7b-streaming_tgi.ipynb)です。`hf_model_id` で別のモデル（例：`elyza/ELYZA-japanese-Llama-2-7b-instruct`） を指定すれば別のモデルを使用することが可能です。
また、SageMaker JumpStart の Rinna 3.6B モデルも対応しています。

SageMaker エンドポイントにデプロイする際は、以下のようにコマンドライン引数で指定することができます。

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=<SageMaker Endpoint Region> -c modelName=<SageMaker Endpoint Name> -c promptTemplate=<prompt_template_file>
```

promptTemplate はプロンプトを構築するためのテンプレートを JSON にしたファイル名を指定します。 (例: `llama2.json`)
プロンプトテンプレートの例は `prompt_templates` フォルダを参照してください。
