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

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。また、`/packages/cdk/kendra-docs/docs` に保存されているデータが、自動で Kendra データソース用の S3 バケットにアップロードされます。

続いて、Kendra の Data source の Sync を以下の手順で行ってください。

1. [Amazon Kendra のコンソール画面](https://console.aws.amazon.com/kendra/home) を開く
1. generative-ai-use-cases-index をクリック
1. Data sources をクリック
1. 「s3-data-source」をクリック
1. Sync now をクリック

Sync run history の Status / Summary に Completed が表示されれば完了です。S3 に保存されているファイルが同期されて、Kendra から検索できるようになります。

#### 既存の Amazon Kendra Index を利用したい場合

既存の Kendra Index を利用する場合も、上記のように `ragEnabled` は `true` である必要がある点に注意してください。

context の `kendraIndexArn` に Index の ARN を指定します。もし、既存の Kendra Index で S3 データソースを利用している場合は、`kendraDataSourceBucketName` にバケット名を指定します。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "kendraIndexArn": "<Kendra Index ARN>",
    "kendraDataSourceBucketName": "<Kendra S3 Data Source Bucket Name>"
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

### Agent チャットユースケースの有効化

Agent チャットユースケースでは Agent for Amazon Bedrock を利用してアクションを実行させたり、Knowledge base for Amazon Bedrock のベクトルデータベースを参照することが可能です。



#### 検索エージェントのデプロイ

API と連携し最新情報を参照して回答する Agent を作成します。Agent のカスタマイズを行い他のアクションを追加できるほか、複数の Agent を作成し切り替えることが可能です。

検索エージェント をデプロイする際は、最初に Agent で使用する Lambda のデプロイと手動で Agent を作成した後に作成した Agent を登録するため2回のデプロイが必要です。

デフォルトで使用できる検索エージェントでは、無料利用枠の大きさ・リクエスト数の制限・コストの観点から [Brave Search API の Data for AI](https://brave.com/search/api/) を使用していますが、他の API にカスタマイズすることも可能です。API キーの取得はフリープランでもクレジットカードの登録が必要になります。

> [!NOTE]
> Agent チャットユースケースを有効化すると Agent チャットユースケースでのみ外部 API にデータを送信します。（デフォルトでは Brave Search API）他のユースケースは引き続き AWS 内のみに閉じて利用することが可能です。社内ポリシー、API の利用規約などを確認してから有効化してください。

context の `agentEnabled` と `searchAgentEnabled` に `true` を指定し(デフォルトは `false`)、`agentRegion` は [Agent for Bedrock が利用できるリージョン](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-supported.html) から指定し、`searchApiKey` に検索エンジンの API キーを指定します。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
    "searchAgentEnabled": true,
    "searchApiKey": "<検索エンジンの API キー>",
  }
}
```

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。これにより、Bedrock が参照する Lambda 関数 と OpenAPI Schema が `agentRegion` にデプロイされます。

続いて、 [Agent の AWS コンソール画面](https://console.aws.amazon.com/bedrock/home?#/agents) から手動で Agent を作成します。設定は基本的にデフォルトのままで、Agent のプロンプトは以下の例を参考にプロンプトを入力します。モデルはレスポンスが早いため `anthropic.claude-instant-v1` を推奨します。アクショングループ名はモデルに入力されるためわかりやすい名前（例：`Search`）にし、アクショングループの設定には、デプロイした際の出力の Cfn Output から Lambda 関数（`AgentLambdaFunctionName`）と S3 にアップロードされた Schema ファイル（`AgentSchemaURI`）を指定します。（複数スタックに分かれているため上にスクロールする必要があります）ナレッジベースは必要ないため設定不要です。

```
プロンプト例: あなたは指示に応えるアシスタントです。 指示に応えるために必要な情報が十分な場合はすぐに回答し、不十分な場合は検索を行い必要な情報を入手し回答してください。複数回検索することが可能です。
```

作成された Agent から Alias を作成し、`agentId` と `aliasId` をコピーし以下の形式で context 追加します。`displayName` は UI に表示したい名称を設定してください。`npm run cdk:deploy` で再度デプロイして反映させます。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "agents": [
      {
        "displayName": "SearchEngine",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

#### Knowledge base エージェントのデプロイ

Knowledge base for Amazon Bedrock と連携したエージェントを手動で作成し登録することも可能です。

まず、[Knowledge base の AWS コンソール画面](https://console.aws.amazon.com/bedrock/home?#/knowledge-bases) から[Knowledge base for Amazon Bedrock のドキュメント](https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/knowledge-base-create.html)を参考にナレッジベースを作成します。リージョンは後述する `agentRegion` と同じリージョンに作成してください。

続いて、 [Agent の AWS コンソール画面](https://console.aws.amazon.com/bedrock/home?#/agents) から手動で Agent を作成します。設定は基本的にデフォルトのままで、Agent のプロンプトは以下の例を参考にプロンプトを入力します。モデルはレスポンスが早いため `anthropic.claude-instant-v1` を推奨します。アクショングループは必要ないため設定せずに進み、ナレッジベースでは前のステップで作成したナレッジベースを登録し、プロンプトは以下の例を参考に入力します。

```
Agent プロンプト例: あなたは指示に応えるアシスタントです。 指示に応じて情報を検索し、その内容から適切に回答してください。情報に記載のないものについては回答しないでください。複数回検索することが可能です。
Knowledge base プロンプト例: キーワードで検索し情報を取得します。調査、調べる、Xについて教える、まとめるといったタスクで利用できます。会話から検索キーワードを推測してください。検索結果には関連度の低い内容も含まれているため関連度の高い内容のみを参考に回答してください。複数回実行可能です。
```

作成された Agent から Alias を作成し、`agentId` と `aliasId` をコピーし以下の形式で context 追加します。`displayName` は UI に表示したい名称を設定してください。また、context の `agentEnabled` を True にし、`agentRegion` は Agent を作成したリージョンを指定します。`npm run cdk:deploy` で再度デプロイして反映させます。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
    "agents": [
      {
        "displayName": "Knowledge base",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

## Amazon Bedrock のモデルを変更する

`cdk.json` の `modelRegion`, `modelIds`, `imageGenerationModelIds` でモデルとモデルのリージョンを指定します。`modelIds` と `imageGenerationModelIds` は指定したリージョンで利用できるモデルの中から利用したいモデルのリストで指定してください。モデルの一覧は[ドキュメント](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html) をご確認ください。

現状このソリューションが対応しているモデルは以下です

```
"anthropic.claude-3-sonnet-20240229-v1:0",
"anthropic.claude-v2",
"anthropic.claude-instant-v1",
"meta.llama2-13b-chat-v1",
"meta.llama2-70b-chat-v1",
"mistral.mistral-7b-instruct-v0:2",
"mistral.mixtral-8x7b-instruct-v0:1",
```

**指定したリージョンで指定したモデルが有効化されているかご確認ください。**

### us-east-1 (バージニア) の Amazon Bedrock のモデルを利用する例

```bash
  "modelRegion": "us-east-1",
  "modelIds": [
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-v2",
    "anthropic.claude-instant-v1",
  ],
  "imageGenerationModelIds": [
    "stability.stable-diffusion-xl-v1",
    "amazon.titan-image-generator-v1"
  ],
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

### AWS WAF による制限を有効化する

#### IP アドレスによる制限

Web ページへのアクセスを IP で制限したい場合、AWS WAF による IP 制限を有効化することができます。[packages/cdk/cdk.json](/packages/cdk/cdk.json) の `allowedIpV4AddressRanges` では許可する IPv4 の CIDR を配列で指定することができ、`allowedIpV6AddressRanges` では許可する IPv6 の CIDR を配列で指定することができます。

```json
  "context": {
    "allowedIpV4AddressRanges": ["192.168.0.0/24"], // null から、許可 CIDR リストを指定することで有効化
    "allowedIpV6AddressRanges": ["2001:0db8::/32"], // null から、許可 CIDR リストを指定することで有効化
```


#### 地理的制限

Web ページへのアクセスをアクセス元の国で制限したい場合、AWS WAF による地理的制限を有効化することができます。[packages/cdk/cdk.json](/packages/cdk/cdk.json) の `allowedCountryCodes` で許可する国を Country Code の配列で指定することができます。
指定する国の Country Code は[ISO 3166-2 from wikipedia](https://en.wikipedia.org/wiki/ISO_3166-2)をご参照ください。
```json
  "context": {
    "allowedCountryCodes": ["JP"], // null から、許可国リストを指定することで有効化
```

`allowedIpV4AddressRanges` あるいは `allowedIpV6AddressRanges` あるいは `allowedCountryCodes` のいずれかを指定して再度 `npm run cdk:deploy` を実行すると、WAF 用のスタックが us-east-1 にデプロイされます（AWS WAF V2 は CloudFront に使用する場合、us-east-1 のみしか現状対応していません）。us-east-1 で CDK を利用したことがない場合は、以下のコマンドを実行して、デプロイ前に Bootstrap を行ってください。

```bash
npx -w packages/cdk cdk bootstrap --region us-east-1
```

### SAML 認証

Microsoft Entra ID (旧 Azure Active Directory) などの IdP が提供する SAML 認証機能と連携ができます。  
[こちらに Microsoft Entra ID と SAML 設定を行う参考手順](SAML_WITH_ENTRA_ID.md) があります。Microsoft Entra ID の設定を含めた詳細な手順があるので、こちらもご活用ください。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**

```json
  "samlAuthEnabled": true,
  "samlCognitoDomainName": "your-preferred-name.auth.ap-northeast-1.amazoncognito.com",
  "samlCognitoFederatedIdentityProviderName": "EntraID",
```
- samlAuthEnabled : `true` にすることで、SAML 専用の認証画面に切り替わります。Cognito user pools を利用した従来の認証機能は利用できなくなります。
- samlCognitoDomainName : Cognito の App integration で設定する Cognito Domain 名を指定します。
- samlCognitoFederatedIdentityProviderName : Cognito の Sign-in experience で設定する Identity Provider の名前を指定します。

## モニタリング用のダッシュボードの有効化

入力/出力 Token 数や直近のプロンプト集などが集約されたダッシュボードを作成します。
**ダッシュボードはアプリケーションに組み込まれたものではなく、Amazon CloudWatch のダッシュボードです。**
Amazon CloudWatch のダッシュボードは、[マネージメントコンソール](https://console.aws.amazon.com/cloudwatch/home#dashboards)から閲覧できます。
ダッシュボードを閲覧するには、マネージメントコンソールにログイン可能かつダッシュボードが閲覧可能な権限を持った IAM ユーザーの作成が必要です。

context の `dashboard` に `true` を設定します。(デフォルトは `false`)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "dashboard": true
  }
}
```

変更後に `npm run cdk:deploy`　で再度デプロイして反映させます。context の `modelRegion` に指定されたリージョンに `GenerativeAiUseCasesDashboardStack` という名前の Stack がデプロイされます。出力された値はこの後の手順で利用します。

続いて、Amazon Bedrock のログの出力を設定します。[Amazon Bedrock の Settings](https://console.aws.amazon.com/bedrock/home#settings) を開き、Model invocation logging を有効化します。Select the logging destinations には CloudWatch Logs only を選択してください。(S3 にも出力したい場合、Both S3 and CloudWatch Logs を選択しても構いません。) また、Log group name には `npm run cdk:deploy` 時に出力された `GenerativeAiUseCasesDashboardStack.BedrockLogGroup` を指定してください。(例: `GenerativeAiUseCasesDashboardStack-LogGroupAAAAAAAA-BBBBBBBBBBBB`) Service role は任意の名前で新規に作成してください。なお、Model invocation logging の設定は、context で `modelRegion` として指定しているリージョンで行うことに留意してください。

設定完了後、`npm run cdk:deploy` 時に出力された `GenerativeAiUseCasesDashboardStack.DashboardUrl` を開いてください。

## ファイルアップロード機能の有効化

PDF や Excel などのファイルをアップロードしてテキストを抽出する、ファイルアップロード機能を利用することができます。対応しているファイルは、csv, doc, docx, md, pdf, ppt, pptx, tsv, xlsx です。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "recognizeFileEnabled": true
  }
}
```

ファイルアップロード機能は ECS (Fargate) 上で実行されます。そのため、有効化すると VPC が新たに作成されます。また、Fargate 上で動くコンテナのビルドを行うために、デプロイ用のマシンでは Docker がインストールされている必要があり、Docker デーモンが起動している必要があります。