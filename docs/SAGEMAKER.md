# Amazon SageMaker のカスタムモデルを利用する場合

Amazon SageMaker エンドポイントにデプロイされた大規模言語モデルを利用することが可能です。

Text Generation Inference (TGI) の Huggingface Container を使用した SageMaker Endpoint に対応しています。

モデルはユーザーとアシスタントが交互に発言するチャット形式のプロンプトをサポートしているのが理想的です。

**現在、画像生成ユースケースは Amazon SageMaker エンドポイントに対応していないので、ご注意ください。**

## SageMaker エンドポイントのデプロイ

**利用可能なモデル**

- [SageMaker JumpStart Rinna 3.6B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
- [SageMaker JumpStart Bilingual Rinna 4B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
- [elyza/ELYZA-japanese-Llama-2-7b-instruct](https://github.com/aws-samples/aws-ml-jp/blob/f57da0343d696d740bb980dc16ebf28b1221f90e/tasks/generative-ai/text-to-text/fine-tuning/instruction-tuning/Transformers/Elyza_Inference_TGI_ja.ipynb)

これらのモデル以外でも Text Generation Inference にデプロイしたモデルは利用可能です。

## SageMaker エンドポイントをターゲットにソリューションをデプロイする

事前にデプロイ済みの SageMaker エンドポイントをターゲットのソリューションをデプロイする際は、以下のようにコマンドライン引数で指定することができます。

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=<SageMaker Endpoint Region> -c modelName=<SageMaker Endpoint Name> -c promptTemplate=<Prompt Template File>
```

promptTemplate はプロンプトを構築するためのテンプレートを JSON にしたファイル名を指定します。 (例: `llama2.json`)
プロンプトテンプレートの例は `prompt-templates` フォルダを参照してください。

## デプロイの例

**Rinna 3.6B**

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=jumpstart-dft-hf-llm-rinna-3-6b-instruction-ppo-bf16 -c promptTemplate=rinna.json
```

**Bilingual Rinna 4B**

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=jumpstart-dft-bilingual-rinna-4b-instruction-ppo-bf16 -c promptTemplate=bilingualRinna.json
```

**ELYZA-japanese-Llama-2-7b-instruct**

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=elyza-7b-inference -c promptTemplate=llama2.json
```
