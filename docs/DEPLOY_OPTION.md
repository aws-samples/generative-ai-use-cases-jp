# デプロイオプション

## 設定方法

このアプリケーションは、AWS CDK の context で設定を変更します。

**CDK の context は '-c' でも指定できますが、その場合コードベースに変更が入らずフロントエンドのビルドが実施されないため、このアセットに関しては全ての設定は cdk.json の設定を変更することを推奨します。**

### cdk.json の値を変更する方法

[packages/cdk/cdk.json](/packages/cdk/cdk.json) の context 以下の値を変更することで設定します。例えば、`"ragEnabled": true` と設定することで RAG チャットのユースケースを有効化できます。context の値を設定した後、以下のコマンドで再度デプロイすることで設定が反映されます。

```bash
npm run cdk:deploy
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

## Amazon Bedrock のモデルを変更する

`cdk.json` の `modelRegion`, `modelIds`, `imageGenerationModelIds` でモデルとモデルのリージョンを指定します。`modelIds` と `imageGenerationModelIds` は指定したリージョンで利用できるモデルの中から利用したいモデルのリストで指定してください。モデルの一覧は[ドキュメント](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html) をご確認ください。

**指定したリージョンで指定したモデルが有効化されているかご確認ください。**

### us-east-1 (バージニア) の Amazon Bedrock のモデルを利用する例

```bash
  "modelRegion": "us-east-1",
  "modelIds": ["anthropic.claude-v2","anthropic.claude-instant-v1"],
  "imageGenerationModelIds": ["stability.stable-diffusion-xl-v0","stability.stable-diffusion-xl-v1","amazon.titan-image-generator-v1"],
```

### ap-northeast-1 (東京) の Amazon Bedrock のモデルを利用する例

```bash
  "modelRegion": "ap-northeast-1",
  "modelIds": ["anthropic.claude-instant-v1"],
  "imageGenerationModelIds": [],
```

**注：UI 上は表示されますが、Stable Diffusion および Titan Image が未対応なため、画像生成は現状 ap-northeast-1 では利用できません。**

## Amazon SageMaker のカスタムモデルを利用したい場合

Amazon SageMaker エンドポイントにデプロイされた大規模言語モデルを利用することが可能です。Text Generation Inference (TGI) の Huggingface Container を使用した SageMaker Endpoint に対応しています。モデルはユーザーとアシスタントが交互に発言するチャット形式のプロンプトをサポートしているのが理想的です。現在、画像生成ユースケースは Amazon SageMaker エンドポイントに対応していないので、ご注意ください。

**利用可能なモデルの例** (これらのモデル以外でも Text Generation Inference にデプロイしたモデルは利用可能です。)
 - [SageMaker JumpStart Rinna 3.6B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
 - [SageMaker JumpStart Bilingual Rinna 4B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
 - [elyza/ELYZA-japanese-Llama-2-7b-instruct](https://github.com/aws-samples/aws-ml-jp/blob/f57da0343d696d740bb980dc16ebf28b1221f90e/tasks/generative-ai/text-to-text/fine-tuning/instruction-tuning/Transformers/Elyza_Inference_TGI_ja.ipynb)

事前にデプロイ済みの SageMaker エンドポイントをターゲットのソリューションをデプロイする際は、以下のように `cdk.json` で指定することができます。

endpointNames は SageMaker エンドポイント名のリストです。（例：`elyza-llama-2,rinna`）
バックエンドでプロンプトを構築する際のテンプレートを指定するために便宜上エンドポイント名の中にプロンプトの種類を含める必要があります。（例：`llama-2`、`rinna` など）詳しくは `packages/cdk/lambda/utils/promptTemplates.ts` を参照してください。

```bash
  "modelRegion": "<SageMaker Endpoint Region>",
  "endpointNames": ["<SageMaker Endpoint Name>"],
```

### Rinna 3.6B と Bilingual Rinna 4B を利用する例

```bash
  "modelRegion": "us-west-2",
  "endpointNames": ["jumpstart-dft-hf-llm-rinna-3-6b-instruction-ppo-bf16","jumpstart-dft-bilingual-rinna-4b-instruction-ppo-bf16"],
```

### ELYZA-japanese-Llama-2-7b-instruct を利用する例

```bash
  "modelRegion": "us-west-2",
  "endpointNames": ["elyza-japanese-llama-2-7b-inference"],
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

### サインアップできるメールアドレスのドメインを制限する
context の allowedSignUpEmailDomains に 許可するドメインのリストを指定します（デフォルトは`null`）。

値はstringのlist形式で指定し、各stringには"@"を含めないでください。メールアドレスのドメインが、許可ドメインのいずれか同じであればサインアップできます。`null` を指定すると何も制限されず、すべてのドメインを許可します。`[]` を指定するとすべて禁止し、どのドメインのメールアドレスでも登録できません。

設定すると、許可ドメインでないユーザは、Webのサインアップ画面で「アカウントを作る」を実行したときにエラーになり、サービスに進むことができなくなります。また、AWSマネジメントコンソールで、Cognitoのページで「ユーザを作成」を実行したときにエラーになります。

既にCognitoに作成されているユーザには影響ありません。新規にサインアップ・作成しようとしているユーザのみに適用されます。


**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**

設定例

- `amazon.com` のドメインのメールアドレスであればサインアップできるように設定する例

```json
{
  "context": {
    "allowedSignUpEmailDomains": ["amazon.com"], // null から、許可ドメインを指定することで有効化
  }
}
```

- `amazon.com` か `amazon.jp` のどちらかのドメインのメールアドレスであればサインアップできるように設定する例

```json
{
  "context": {
    "allowedSignUpEmailDomains": ["amazon.com", "amazon.jp"], // null から、許可ドメインを指定することで有効化
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
