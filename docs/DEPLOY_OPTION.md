# デプロイオプション

## 設定方法

このアプリケーションは、AWS CDK の context で設定を変更します。context の値を指定するには以下の 2 つの方法があります。**なお「`-c` オプションで変更する方法」では、コードベースに変更が入らないため、フロントエンドのビルドが実施されません。フロントエンドの更新が必要な `ragEnabled` (RAG チャットユースケースの有効化) と `selfSignUpEnabled` (セルフサインアップを無効化する) に関しては「`cdk.json` の値を変更する方法」の方法で更新しないとエラーになります。**

### cdk.json の値を変更する方法

[packages/cdk/cdk.json](/packages/cdk/cdk.json) の context 以下の値を変更することで設定します。例えば、`"ragEnabled": true` と設定することで RAG チャットのユースケースを有効化できます。設定を固定化したい場合は、こちらの方法がおすすめです。context の値を設定した後、以下のコマンドで再度デプロイすることで設定が反映されます。

```bash
npm run cdk:deploy
```

### `-c` オプションで変更する方法

`npm run cdk:deploy` に `-c` オプションを付与して設定します。例えば、以下のコマンドで利用するモデルを設定します。(`--` は必要です。) デプロイオプションの検証中で、cdk.json に設定をコミットしたくない場合におすすめです。

```bash
npm run cdk:deploy -- -c modelName=anthropic.claude-instant-v1
```

## ユースケースの設定

### RAG チャットユースケースの有効化

context の `ragEnabled` に `true` を指定します。(デフォルトは `false`)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "ragEnabled": true
  }
}
```

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。

続いて、Kendra の Data source の Sync を以下の手順で行ってください。

1. [Amazon Kendra のコンソール画面](https://console.aws.amazon.com/kendra/home) を開く
1. generative-ai-use-cases-index をクリック
1. Data sources をクリック
1. WebCrawler をクリック
1. Sync now をクリック

Sync run history の Status / Summary に Completed が表示されれば完了です。AWS の Amazon Bedrock 関連のページをクローリングし、自動でドキュメントが追加されます。

#### 既存の Amazon Kendra Index を利用したい場合

既存の Kendra Index を利用する場合も、上記のように `ragEnabled` は `true` である必要がある点に注意してください。

context の `kendraIndexArn` に Index の ARN を指定します。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "kendraIndexArn": "<Kendra Index ARN>"
  }
}
```

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。

`<Kendra Index ARN>` は以下のような形式です

```
arn:aws:kendra:<Region>:<AWS Account ID>:index/<Index ID>
```

具体的には以下のような文字列です。

```
arn:aws:kendra:ap-northeast-1:333333333333:index/77777777-3333-4444-aaaa-111111111111
```

### 画像生成の有効化

画像生成のユースケースをご利用になる際は、context の値の変更は必要ありません。ただし、Stability AI の Stable Diffusion XL モデルを有効化する必要があります。[Model access 画面](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) を開き、「Edit」 → 「Stable Diffusion XL にチェック」 → 「Save changes」 と操作していただいて、バージニア北部リージョンにて Amazon Bedrock (基盤モデル: Stable Diffusion XL) を利用できる状態にしてください。なお、画像生成に関しては Stable Diffusion XL を有効化していない場合でもユースケースとして画面に表示されるため、注意してください。モデルを有効にしていない状態で実行するとエラーになります。

## Amazon Bedrock の違うモデルを利用したい場合

以下の形式でモデル、モデルのリージョン、プロンプトのテンプレートを指定します。promptTemplate はプロンプトを構築するためのテンプレートを JSON にしたファイル名を指定します。 (例: `claude.json`) プロンプトテンプレートの例は `prompt-templates` フォルダを参照してください。

```bash
npm run cdk:deploy -- -c modelRegion=<Region> -c modelName=<Model Name> -c promptTemplate=<Prompt Tempalte File>
```

### ap-northeast-1 (東京) の Amazon Bedrock Claude Instant を利用する例

```bash
npm run cdk:deploy -- -c modelRegion=ap-northeast-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```

### us-east-1 (バージニア) の Amazon Bedrock Claude Instant を利用する例

```bash
npm run cdk:deploy -- -c modelRegion=us-east-1 -c modelName=anthropic.claude-instant-v1 -c promptTemplate=claude.json
```

## Amazon SageMaker のカスタムモデルを利用したい場合

Amazon SageMaker エンドポイントにデプロイされた大規模言語モデルを利用することが可能です。Text Generation Inference (TGI) の Huggingface Container を使用した SageMaker Endpoint に対応しています。モデルはユーザーとアシスタントが交互に発言するチャット形式のプロンプトをサポートしているのが理想的です。現在、画像生成ユースケースは Amazon SageMaker エンドポイントに対応していないので、ご注意ください。

**利用可能なモデルの例** (これらのモデル以外でも Text Generation Inference にデプロイしたモデルは利用可能です。)
 - [SageMaker JumpStart Rinna 3.6B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
 - [SageMaker JumpStart Bilingual Rinna 4B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
 - [elyza/ELYZA-japanese-Llama-2-7b-instruct](https://github.com/aws-samples/aws-ml-jp/blob/f57da0343d696d740bb980dc16ebf28b1221f90e/tasks/generative-ai/text-to-text/fine-tuning/instruction-tuning/Transformers/Elyza_Inference_TGI_ja.ipynb)

事前にデプロイ済みの SageMaker エンドポイントをターゲットのソリューションをデプロイする際は、以下のようにコマンドライン引数で指定することができます。

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=<SageMaker Endpoint Region> -c modelName=<SageMaker Endpoint Name> -c promptTemplate=<Prompt Template File>
```

### Rinna 3.6B を利用する例

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=jumpstart-dft-hf-llm-rinna-3-6b-instruction-ppo-bf16 -c promptTemplate=rinna.json
```

### Bilingual Rinna 4B を利用する例

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=jumpstart-dft-bilingual-rinna-4b-instruction-ppo-bf16 -c promptTemplate=bilingualRinna.json
```

### ELYZA-japanese-Llama-2-7b-instruct を利用する例

```bash
npm run cdk:deploy -- -c modelType=sagemaker -c modelRegion=us-west-2 -c modelName=elyza-7b-inference -c promptTemplate=llama2.json
```

## セキュリティ関連設定

### セルフサインアップを無効化する

context の `selfSignUpEnabled` に `false` を指定します。(デフォルトは `true`)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "selfSignUpEnabled": false,
  }
}
```

### AWS WAF による IP 制限を有効化する

Web ページへのアクセスを IP で制限したい場合、AWS WAF による IP 制限を有効化することができます。[packages/cdk/cdk.json](/packages/cdk/cdk.json) の `allowedIpV4AddressRanges` では許可する IPv4 の CIDR を配列で指定することができ、`allowedIpV6AddressRanges` では許可する IPv6 の CIDR を配列で指定することができます。

```json
  "context": {
    "allowedIpV4AddressRanges": ["192.168.0.0/24"], // null から、許可 CIDR リストを指定することで有効化
    "allowedIpV6AddressRanges": ["2001:0db8::/32"], // null から、許可 CIDR リストを指定することで有効化
```

`allowedIpV4AddressRanges` あるいは `allowedIpV6AddressRanges` のどちらかを指定して再度 `npm run cdk:deploy` を実行すると、WAF 用のスタックが us-east-1 にデプロイされます（AWS WAF V2 は CloudFront に使用する場合、us-east-1 のみしか現状対応していません）。us-east-1 で CDK を利用したことがない場合は、以下のコマンドを実行して、デプロイ前に Bootstrap を行ってください。

```bash
npx -w packages/cdk cdk bootstrap --region us-east-1
```
