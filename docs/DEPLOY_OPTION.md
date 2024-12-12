# デプロイオプション

## 設定方法

GenU は、AWS CDK の context で設定を変更します。

**CDK の context は '-c' でも指定できますが、その場合コードベースに変更が入らずフロントエンドのビルドが実施されないため、このアセットに関しては全ての設定は cdk.json の設定を変更することを推奨します。**

### cdk.json の値を変更する方法

[packages/cdk/cdk.json](/packages/cdk/cdk.json) の context 以下の値を変更することで設定します。例えば、`"ragEnabled": true` と設定することで RAG チャットのユースケースを有効化できます。context の値を設定した後、以下のコマンドで再度デプロイすることで設定が反映されます。

```bash
npm run cdk:deploy
```

## ユースケースの設定

### RAG チャット (Amazon Kendra) ユースケースの有効化

context の `ragEnabled` に `true` を指定します。(デフォルトは `false`)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "ragEnabled": true
  }
}
```

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。また、`/packages/cdk/rag-docs/docs` に保存されているデータが、自動で Kendra データソース用の S3 バケットにアップロードされます。(ただし `logs` から始まる名前のファイルは同期されませんので注意してください。)

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

### RAG チャット (Knowledge Base) ユースケースの有効化

context の `ragKnowledgeBaseEnabled` に `true` を指定します。(デフォルトは `false`)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "ragKnowledgeBaseEnabled": true,
    "ragKnowledgeBaseStandbyReplicas": false,
    "ragKnowledgeBaseAdvancedParsing": false,
    "ragKnowledgeBaseAdvancedParsingModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "embeddingModelId": "amazon.titan-embed-text-v2:0",
  }
}
```

`ragKnowledgeBaseStandbyReplicas` は自動作成される OpenSearch Serverless の冗長化に関する値です。
- `false` : 開発およびテスト目的に適した指定。シングル AZ で稼働し、OCU のコストを半分にできる。
- `true` : 本番環境に適した設定。複数の AZ で稼働し、高可用性な構成が実現できる。

`embeddingModelId` は embedding に利用するモデルです。現状、以下モデルをサポートしています。

```
"amazon.titan-embed-text-v1"
"amazon.titan-embed-text-v2:0"
"cohere.embed-multilingual-v3"
"cohere.embed-english-v3"
```

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。この際、`cdk.json` の `modelRegion` で指定されているリージョンに Knowledge Base がデプロイされます。以下に注意してください。

- `modelRegion` リージョンの Bedrock で `embeddingModelId` のモデルが有効化されている必要があります。
- `modelRegion` リージョンで `npm run cdk:deploy` の前に AWS CDK の Bootstrap が完了している必要があります。

```bash
# 以下はBootstrap するコマンドの例 (modelRegion が us-east-1 だとした場合)
npx -w packages/cdk cdk bootstrap --region us-east-1
```

デプロイ時に `/packages/cdk/rag-docs/docs` に保存されているデータが、自動で Knowledge Base データソース用の S3 バケットにアップロードされます。(ただし `logs` から始まる名前のファイルは同期されませんので注意してください。) デプロイ完了後、以下の手順で Knowledge Base の Data source を Sync してください。

1. [Knowledge Base のコンソール画面](https://console.aws.amazon.com/bedrock/home#/knowledge-bases) を開く
1. generative-ai-use-cases-jp をクリック
1. s3-data-source を選択肢、Sync をクリック

Status が Available になれば完了です。S3 に保存されているファイルが取り込まれており、Knowledge Base から検索できます。

> [!NOTE]
> RAG チャット (Knowledge Base) の設定を有効後に、再度無効化する場合は、`ragKnowledgeBaseEnabled: false` にして再デプロイすれば RAG チャット (Knowledge Base) は無効化されますが、`RagKnowledgeBaseStack` 自体は残ります。マネージメントコンソールを開き、modelRegion の CloudFormation から `RagKnowledgeBaseStack` というスタックを削除することで完全に消去ができます。

#### Advanced Parsing を有効化

[Advanced Parsing 機能](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html#kb-advanced-parsing) を有効化できます。Advanced Parsing は、ファイル内の表やグラフなどの非構造化データから、情報を分析および抽出する機能です。ファイル内のテキストに加えて、表やグラフなどから抽出したデータを付け加えることで、RAG の精度を上げやすくするメリットがあります。

- `ragKnowledgeBaseAdvancedParsing` : `true` で Advanced Parsing を有効化
- `ragKnowledgeBaseAdvancedParsingModelId` : 情報を抽出するときに利用するモデル ID を指定
  - サポートしているモデル (2024/08 現在)
    - `anthropic.claude-3-sonnet-20240229-v1:0`
    - `anthropic.claude-3-haiku-20240307-v1:0`

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "ragKnowledgeBaseEnabled": true,
    "ragKnowledgeBaseStandbyReplicas": false,
    "ragKnowledgeBaseAdvancedParsing": true,
    "ragKnowledgeBaseAdvancedParsingModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "embeddingModelId": "amazon.titan-embed-text-v2:0",
  }
}
```

#### チャンク戦略を変更

[rag-knowledge-base-stack.ts](/packages/cdk/lib/rag-knowledge-base-stack.ts) に chunkingConfiguration を指定する箇所があります。
コメントアウトを外して、[CDK ドキュメント](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnDataSource.ChunkingConfigurationProperty.html)や [CloudFormation ドキュメント](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking-parsing.html)を参考に任意のチャンク戦略へ変更が可能です。

例えば、セマンティックチャンクに変更する場合は、コメントアウトをはずして以下のように指定します。

```typescript
// セマンティックチャンク
chunkingConfiguration: {
  chunkingStrategy: 'SEMANTIC',
  semanticChunkingConfiguration: {
    maxTokens: 300,
    bufferSize: 0,
    breakpointPercentileThreshold: 95,
  },
},
```

その後、[Knowledge Base や OpenSearch Service を再作成して変更を加える](./DEPLOY_OPTION.md#knowledge-base-や-opensearch-service-を再作成して変更を加える)の章を参照して、変更を加えます。



#### Knowledge Base や OpenSearch Service を再作成して変更を加える

[Knowledge Base のチャンク戦略](./DEPLOY_OPTION.md#チャンク戦略を変更)や、OpenSearch Service に関する以下の `cdk.json` パラメーターについて、変更を加えた後に `npm run cdk:deploy` を実行しても変更が反映されません。

- `embeddingModelId`
- `ragKnowledgeBaseStandbyReplicas`
- `ragKnowledgeBaseAdvancedParsing`
- `ragKnowledgeBaseAdvancedParsingModelId`

変更を反映する場合は、以下の手順で既存の Knowledge Base 関連のリソースを削除してから再作成を行います。

1. `cdk.json` で `ragKnowledgeBaseEnabled` を false にしてデプロイを行う
1. [CloudFormation](https://console.aws.amazon.com/cloudformation/home) (リージョンに注意) を開き、RagKnowledgeBaseStack クリック
1. 右上の Delete をクリックして を開き、RagKnowledgeBaseStack を削除  
 **S3 バケットや RAG 用のファイルも含めて削除され、一時的に RAG チャットが利用不可になります**
1. `cdk.json` やチャンク戦略に変更を加える
1. RagKnowledgeBaseStack の削除完了後、再度 `npm run cdk:deploy` でデプロイ

RagKnowledgeBaseStack の削除に伴い、**RAG チャット用の S3 バケットや格納されている RAG 用のファイルが削除**されます。
S3 バケット内にアップロードした RAG 用のファイルが存在する場合は、退避したあとに再度アップロードしてください。
また、前述した手順に従い Data source を再度 Sync してください。

#### OpenSearch Service の Index をマネージメントコンソールで確認する方法

デフォルトでは、マネージメントコンソールから OpenSearch Service の Indexes タブを開くと `User does not have permissions for the requested resource` というエラーが表示されます。
これは、Data access policy でマネージメントコンソールにログインしている IAM ユーザーを許可していないためです。
以下の手順に従い、必要な権限を手動で追加してください。

1. [OpenSearch Service](https://console.aws.amazon.com/aos/home?#opensearch/collections) (リージョンに注意) を開き、generative-ai-use-cases-jp をクリック
1. ページ下部 Data access の Associated policy である generative-ai-use-cases-jp をクリック
1. 右上の Edit をクリック
1. ページ中部の Select principals の Add principals をクリックし、IAM User/Role 等 (マネージメントコンソールにログインしている権限) を追加
1. Save

保存後、少し時間をおいて再度アクセスしてください。

### Agent チャットユースケースの有効化

Agent チャットユースケースでは、以下のご利用が可能です。
- Code Interpreter を利用したデータの可視化、コード実行、データ分析
- Agents for Amazon Bedrock を利用したアクションを実行させたり
- Knowledge Bases for Amazon Bedrock のベクトルデータベースを参照

#### Code Interpreter エージェントのデプロイ

Code Interpreter を利用したデータの可視化、コード実行、データ分析などが実行できます。

Code Interpreter エージェントは Agent を有効化するとデプロイされます。

context の `agentEnabled` に `true` を指定し(デフォルトは `false`)、`agentRegion` は [Agent for Bedrock が利用できるリージョン](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-supported.html) から指定します。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
  }
}
```

#### 検索エージェントのデプロイ

API と連携し最新情報を参照して回答する Agent を作成します。Agent のカスタマイズを行い他のアクションを追加できるほか、複数の Agent を作成し切り替えることが可能です。

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

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。これにより、デフォルトの検索エンジン Agent がデプロイされます。

デフォルトの Agent 以外に手動で作成した Agent を登録したい場合、以下のように追加の Agent を `agents` に追加してください。

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

また、`packages/cdk/lib/construct/agent.ts` を改修し新たな Agent を定義することも可能です。

> [!NOTE]
> 検索エージェントの設定を有効後に、再度無効化する場合は、`searchAgentEnabled: false` にして再デプロイすれば検索エージェントは無効化されますが、`WebSearchAgentStack` 自体は残ります。マネージメントコンソールを開き、agentRegion の CloudFormation から `WebSearchAgentStack` というスタックを削除することで完全に消去ができます。

#### Knowledge Bases for Amazon Bedrock エージェントのデプロイ

Knowledge Bases for Amazon Bedrock と連携したエージェントを手動で作成し登録することも可能です。

まず、[ナレッジベースの AWS コンソール画面](https://console.aws.amazon.com/bedrock/home?#/knowledge-bases) から[Knowledge Bases for Amazon Bedrock のドキュメント](https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/knowledge-base-create.html)を参考にナレッジベースを作成します。リージョンは後述する `agentRegion` と同じリージョンに作成してください。

続いて、 [エージェントの AWS コンソール画面](https://console.aws.amazon.com/bedrock/home?#/agents) から手動で Agent を作成します。設定は基本的にデフォルトのままで、Agent のプロンプトは以下の例を参考にプロンプトを入力します。モデルはレスポンスが早いため `anthropic.claude-instant-v1` を推奨します。アクショングループは必要ないため設定せずに進み、ナレッジベースでは前のステップで作成したナレッジベースを登録し、プロンプトは以下の例を参考に入力します。

```
Agent プロンプト例: あなたは指示に応えるアシスタントです。 指示に応じて情報を検索し、その内容から適切に回答してください。情報に記載のないものについては回答しないでください。複数回検索することが可能です。
Knowledge Base プロンプト例: キーワードで検索し情報を取得します。調査、調べる、Xについて教える、まとめるといったタスクで利用できます。会話から検索キーワードを推測してください。検索結果には関連度の低い内容も含まれているため関連度の高い内容のみを参考に回答してください。複数回実行可能です。
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
        "displayName": "Knowledge Base",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

### PromptFlow チャットユースケースの有効化

PromptFlow チャットユースケースでは、作成済みの Prompt Flow を呼び出すことができます。

プロジェクトのルートディレクトリにある `cdk.json` ファイルを開き、`context` セクション内に `promptFlows` 配列を追加または編集します。

[Prompt Flows の AWS コンソール画面](https://console.aws.amazon.com/bedrock/home#/prompt-flows) から手動で Prompt Flows を作成します。その後、Alias を作成し、作成済みの Prompt Flow の `flowId` と `aliasId`, `flowName` を追加します。`description` にはユーザーの入力を促すための説明文章を記載します。この説明文章は Prompt Flow チャットのテキストボックスに記載されます。以下はその例です。

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```json
{
  "context": {
    "promptFlows": [
      {
        "flowId": "XXXXXXXXXX",
        "aliasId": "YYYYYYYYYY",
        "flowName": "WhatIsItFlow",
        "description": "任意のキーワードをウェブ検索して、説明を返すフローです。文字を入力してください"
      },
      {
        "flowId": "ZZZZZZZZZZ",
        "aliasId": "OOOOOOOOOO",
        "flowName": "RecipeFlow",
        "description": "与えられたJSONをもとに、レシピを作成します。\n{\"dish\": \"カレーライス\", \"people\": 3} のように入力してください。"
      },
      {
        "flowId": "PPPPPPPPPP",
        "aliasId": "QQQQQQQQQQQ",
        "flowName": "TravelPlanFlow",
        "description": "与えられた配列をもとに、旅行計画を作成します。\n[{\"place\": \"東京\", \"day\": 3}, {\"place\": \"大阪\", \"day\": 2}] のように入力してください。"
      }
    ]
  }
}
```



### 映像分析ユースケースの有効化

映像分析ユースケースでは、映像の画像フレームとテキストを入力して画像の内容を LLM に分析させます。
映像分析ユースケースを直接有効化するオプションはありませんが、`cdk.json` でマルチモーダルのモデルが有効化されている必要があります。

2024/06 現在、マルチモーダルのモデルは以下です。

```
"anthropic.claude-3-5-sonnet-20241022-v2:0",
"anthropic.claude-3-5-sonnet-20240620-v1:0",
"anthropic.claude-3-opus-20240229-v1:0",
"anthropic.claude-3-sonnet-20240229-v1:0",
"anthropic.claude-3-haiku-20240307-v1:0",
"us.anthropic.claude-3-5-sonnet-20240620-v1:0",
"us.anthropic.claude-3-opus-20240229-v1:0",
"us.anthropic.claude-3-sonnet-20240229-v1:0",
"us.anthropic.claude-3-haiku-20240307-v1:0",
"eu.anthropic.claude-3-5-sonnet-20240620-v1:0",
"eu.anthropic.claude-3-sonnet-20240229-v1:0",
"eu.anthropic.claude-3-haiku-20240307-v1:0",
"apac.anthropic.claude-3-haiku-20240307-v1:0",
"apac.anthropic.claude-3-sonnet-20240229-v1:0",
"apac.anthropic.claude-3-5-sonnet-20240620-v1:0",
"us.meta.llama3-2-90b-instruct-v1:0",
"us.meta.llama3-2-11b-instruct-v1:0",
"amazon.nova-pro-v1:0",
"amazon.nova-lite-v1:0"
```

これらのいずれかが `cdk.json` の `modelIds` に定義されている必要があります。
詳細は[Amazon Bedrock のモデルを変更する](#Amazon-Bedrock-のモデルを変更する)を参照してください。

```json
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "us.anthropic.claude-3-opus-20240229-v1:0",
    "us.anthropic.claude-3-sonnet-20240229-v1:0",
    "us.anthropic.claude-3-haiku-20240307-v1:0",
    "eu.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "eu.anthropic.claude-3-sonnet-20240229-v1:0",
    "eu.anthropic.claude-3-haiku-20240307-v1:0",
    "apac.anthropic.claude-3-haiku-20240307-v1:0",
    "apac.anthropic.claude-3-sonnet-20240229-v1:0",
    "apac.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "amazon.nova-pro-v1:0",
    "amazon.nova-lite-v1:0",
  ]
```

### プロンプト最適化ツールの有効化

プロンプト最適化ツールは入力したプロンプトを指定したモデルに最適な形に変換します。
プロンプト最適化ツールを直接有効化するオプションはありませんが、`cdk.json` の設定が以下の 2 点を満たす必要があります。
- `modelRegion`: Amazon Bedrock の Prompt optimization がサポートされているリージョンであること
- `modelIds`: Amazon Bedrock の Prompt optimization がサポートされているモデルが 1 つ以上指定されていること

Prompt optimization のサポート状況は [こちら](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-optimize.html) をご参照ください。

## ユースケースビルダーの設定

ユースケースビルダーはデフォルトで有効化されており、デプロイ後画面上に表示される「ビルダーモード」という項目から利用できます。ユースケースビルダーを無効化する場合は、context の `useCaseBuilderEnabled` に `false` を指定します。(デフォルトは `true`)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**
```
{
  "context": {
    "useCaseBuilderEnabled": false
  }
}
```

## Amazon Bedrock のモデルを変更する

`cdk.json` の `modelRegion`, `modelIds`, `imageGenerationModelIds` でモデルとモデルのリージョンを指定します。`modelIds` と `imageGenerationModelIds` は指定したリージョンで利用できるモデルの中から利用したいモデルのリストで指定してください。AWS ドキュメントに、[モデルの一覧](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html)と[リージョン別のモデルサポート一覧](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html)があります。

また、[cross-region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html)のモデルに対応しています。cross-region inference のモデルは `{us|eu}.{model-provider}.{model-name}` で表されるモデルで、`cdk.json` で設定した modelRegion で指定したリージョンの `{us|eu}` と一致している必要があります。

(例) `modelRegion` が `us-east-1` の場合、`us.anthropic.claude-3-5-sonnet-20240620-v1:0` は OK だが、`eu.anthropic.claude-3-5-sonnet-20240620-v1:0` は NG です。

このソリューションが対応しているテキスト生成モデルは以下です。

```
"anthropic.claude-3-5-sonnet-20241022-v2:0",
"anthropic.claude-3-5-haiku-20241022-v1:0",
"anthropic.claude-3-5-sonnet-20240620-v1:0",
"anthropic.claude-3-opus-20240229-v1:0",
"anthropic.claude-3-sonnet-20240229-v1:0",
"anthropic.claude-3-haiku-20240307-v1:0",
"us.anthropic.claude-3-5-sonnet-20241022-v2:0",
"us.anthropic.claude-3-5-haiku-20241022-v1:0",
"us.anthropic.claude-3-5-sonnet-20240620-v1:0",
"us.anthropic.claude-3-opus-20240229-v1:0",
"us.anthropic.claude-3-sonnet-20240229-v1:0",
"us.anthropic.claude-3-haiku-20240307-v1:0",
"eu.anthropic.claude-3-5-sonnet-20240620-v1:0",
"eu.anthropic.claude-3-sonnet-20240229-v1:0",
"eu.anthropic.claude-3-haiku-20240307-v1:0",
"apac.anthropic.claude-3-haiku-20240307-v1:0",
"apac.anthropic.claude-3-sonnet-20240229-v1:0",
"apac.anthropic.claude-3-5-sonnet-20240620-v1:0",
"amazon.titan-text-premier-v1:0",
"us.meta.llama3-2-90b-instruct-v1:0",
"us.meta.llama3-2-11b-instruct-v1:0",
"us.meta.llama3-2-3b-instruct-v1:0",
"us.meta.llama3-2-1b-instruct-v1:0",
"meta.llama3-1-405b-instruct-v1:0",
"meta.llama3-1-70b-instruct-v1:0",
"meta.llama3-1-8b-instruct-v1:0",
"meta.llama3-70b-instruct-v1:0",
"meta.llama3-8b-instruct-v1:0",
"cohere.command-r-plus-v1:0",
"cohere.command-r-v1:0",
"mistral.mistral-large-2407-v1:0",
"mistral.mistral-large-2402-v1:0",
"mistral.mistral-small-2402-v1:0",
"anthropic.claude-v2:1",
"anthropic.claude-v2",
"anthropic.claude-instant-v1",
"mistral.mixtral-8x7b-instruct-v0:1",
"mistral.mistral-7b-instruct-v0:2",
"amazon.nova-pro-v1:0",
"amazon.nova-lite-v1:0",
"amazon.nova-micro-v1:0",
"us.amazon.nova-pro-v1:0",
"us.amazon.nova-lite-v1:0",
"us.amazon.nova-micro-v1:0"
```


このソリューションが対応している画像生成モデルは以下です。

```
"amazon.titan-image-generator-v2:0",
"amazon.titan-image-generator-v1",
"stability.stable-diffusion-xl-v1",
"stability.sd3-large-v1:0",
"stability.stable-image-core-v1:0",
"stability.stable-image-ultra-v1:0"
```

**指定したリージョンで指定したモデルが有効化されているかご確認ください。**

### us-east-1 (バージニア) の Amazon Bedrock のモデルを利用する例

```bash
  "modelRegion": "us-east-1",
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "amazon.nova-pro-v1:0",
    "amazon.nova-lite-v1:0",
    "amazon.nova-micro-v1:0",
    "amazon.titan-text-premier-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "meta.llama3-8b-instruct-v1:0",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "mistral.mistral-large-2402-v1:0"
  ],
  "imageGenerationModelIds": [
    "amazon.titan-image-generator-v2:0",
    "amazon.titan-image-generator-v1",
    "amazon.nova-canvas-v1:0",
    "stability.stable-diffusion-xl-v1"
  ],
```

### us-west-2 (オレゴン) の Amazon Bedrock のモデルを利用する例

```bash
  "modelRegion": "us-west-2",
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "mistral.mistral-large-2407-v1:0"
  ],
  "imageGenerationModelIds": [
    "amazon.titan-image-generator-v2:0",
    "amazon.titan-image-generator-v1",
    "stability.stable-diffusion-xl-v1",
    "stability.sd3-large-v1:0",
    "stability.stable-image-core-v1:0",
    "stability.stable-image-ultra-v1:0"
  ],
```
### cross-region inference が対応しているモデルで us(北部バージニアもしくはオレゴン) の Amazon Bedrock のモデルを利用する場合
```bash
  "modelRegion": "us-west-2",
  "modelIds": [
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    "us.anthropic.claude-3-opus-20240229-v1:0",
    "us.anthropic.claude-3-sonnet-20240229-v1:0",
    "us.anthropic.claude-3-haiku-20240307-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "us.meta.llama3-2-3b-instruct-v1:0",
    "us.meta.llama3-2-1b-instruct-v1:0",
    "us.amazon.nova-pro-v1:0",
    "us.amazon.nova-lite-v1:0",
    "us.amazon.nova-micro-v1:0",
    "cohere.command-r-plus-v1:0",
    "cohere.command-r-v1:0",
    "mistral.mistral-large-2407-v1:0",
    "us.amazon.nova-pro-v1:0",
    "us.amazon.nova-lite-v1:0",
    "us.amazon.nova-micro-v1:0"
  ],
  "imageGenerationModelIds": [
    "amazon.titan-image-generator-v2:0",
    "amazon.titan-image-generator-v1",
    "stability.stable-diffusion-xl-v1",
    "stability.sd3-large-v1:0",
    "stability.stable-image-core-v1:0",
    "stability.stable-image-ultra-v1:0"
  ],
```

### ap-northeast-1 (東京) の Amazon Bedrock のモデルを利用する例

```bash
  "modelRegion": "ap-northeast-1",
  "modelIds": [
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0"
  ],
  "imageGenerationModelIds": [],
```

**注：UI 上は表示されますが、Stable Diffusion および Titan Image が未対応なため、画像生成は現状 ap-northeast-1 では利用できません。**

## Amazon SageMaker のカスタムモデルを利用したい場合

Amazon SageMaker エンドポイントにデプロイされた大規模言語モデルを利用することが可能です。[Text Generation Inference (TGI) の Hugging Face LLM 推論コンテナ](https://aws.amazon.com/blogs/machine-learning/announcing-the-launch-of-new-hugging-face-llm-inference-containers-on-amazon-sagemaker/) を使用した SageMaker Endpoint に対応しています。モデルはユーザーとアシスタントが交互に発言するチャット形式のプロンプトをサポートしているものが理想的です。現在、画像生成ユースケースは Amazon SageMaker エンドポイントに対応していないので、ご注意ください。

TGI コンテナを使用したモデルを SageMaker エンドポイントにデプロイする方法は現在2通りあります。

**SageMaker JumpStart で AWS が事前に用意したモデルをデプロイ**

SageMaker JumpStart では OSS の大規模言語モデルをワンクリックでデプロイできるようにパッケージングして提供しています。SageMaker Studio の JumpStart 画面からモデルを開き "デプロイ" ボタンをクリックしデプロイすることが可能です。提供している日本語モデルとしては例として以下のようなモデルを提供しています。

- [SageMaker JumpStart Elyza Japanese Llama 2 7B Instructt](https://aws.amazon.com/jp/blogs/news/sagemaker-jumpstart-elyza-7b/)
- [SageMaker JumpStart Elyza Japanese Llama 2 13B Instructt](https://aws.amazon.com/jp/blogs/news/sagemaker-jumpstart-elyza-7b/)
- [SageMaker JumpStart CyberAgentLM2 7B Chat](https://aws.amazon.com/jp/blogs/news/cyberagentlm2-on-sagemaker-jumpstart/)
- [SageMaker JumpStart Stable LM Instruct Alpha 7B v2](https://aws.amazon.com/jp/blogs/news/japanese-stable-lm-instruct-alpha-7b-v2-from-stability-ai-is-now-available-in-amazon-sagemaker-jumpstart/)
- [SageMaker JumpStart Rinna 3.6B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)
- [SageMaker JumpStart Bilingual Rinna 4B](https://aws.amazon.com/jp/blogs/news/generative-ai-rinna-japanese-llm-on-amazon-sagemaker-jumpstart/)

**SageMaker SDK を使用して数行のコードでデプロイ**

[AWS と Hugging Face の提携](https://aws.amazon.com/jp/blogs/news/aws-and-hugging-face-collaborate-to-make-generative-ai-more-accessible-and-cost-efficient/)により、SageMaker SDK で Hugging Face に公開されているモデルの ID を指定するだけでモデルのデプロイが可能です。

公開されている Hugging Face のモデルページから *Deploy* > *Amazon SageMaker* を選択するとモデルをデプロイするためのコードが表示されるため、こちらをコピーして実行すればモデルをデプロイすることが可能です。（モデルによりインスタンスサイズや `SM_NUM_GPUS` などのパラメータを変更する必要がある場合があります。デプロイに失敗した際は CloudWatch Logs からログを確認することが可能です）

> [!NOTE]
> デプロイする際、一箇所だけ修正点があります。エンドポイント名が GenU アプリケーションに表示されるほか、モデルのプロンプトテンプレート（次セクションにて説明）をエンドポイント名から判断しているためモデルを区別できるエンドポイント名を指定する必要があります。
そのため、デプロイする際に `huggingface_model.deploy()` の引数に `endpoint_name="<モデルを区別できるエンドポイント名>"` を追加してください。

![Hugging Face モデルページにて Deploy から Amazon SageMaker を選択](./assets/DEPLOY_OPTION/HF_Deploy.png)
![Hugging Face モデルページのデプロイスクリプトのガイド](./assets/DEPLOY_OPTION/HF_Deploy2.png)

### デプロイしたモデルを GenU から呼び出す設定

デプロイした SageMaker エンドポイントをターゲットのソリューションをデプロイする際は、以下のように `cdk.json` で指定することができます。

endpointNames は SageMaker エンドポイント名のリストです。（例：`["elyza-llama-2", "rinna"]`）

バックエンドでプロンプトを構築する際のプロンプトテンプレートを指定するために便宜上エンドポイント名の中にプロンプトの種類を含める必要があります。（例：`llama-2`、`rinna` など）詳しくは `packages/cdk/lambda/utils/models.ts` を参照してください。必要に応じてプロンプトテンプレートを追加してご利用ください。

```bash
  "modelRegion": "<SageMaker Endpoint Region>",
  "endpointNames": ["<SageMaker Endpoint Name>"],
```

**Rinna 3.6B と Bilingual Rinna 4B を利用する例**

```bash
  "modelRegion": "us-west-2",
  "endpointNames": ["jumpstart-dft-hf-llm-rinna-3-6b-instruction-ppo-bf16","jumpstart-dft-bilingual-rinna-4b-instruction-ppo-bf16"],
```

**ELYZA-japanese-Llama-2-7b-instruct を利用する例**

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

設定すると、許可ドメインでないユーザは、Webのサインアップ画面で「アカウントを作る」を実行したときにエラーになり、GenU へのサインアップができなくなります。また、AWSマネジメントコンソールで、Cognitoのサービス画面から「ユーザを作成」を実行したときにエラーになります。

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

Web アプリへのアクセスを IP アドレスで制限したい場合、AWS WAF による IP アドレス制限を有効化することができます。[packages/cdk/cdk.json](/packages/cdk/cdk.json) の `allowedIpV4AddressRanges` では許可する IPv4 の CIDR を配列で指定することができ、`allowedIpV6AddressRanges` では許可する IPv6 の CIDR を配列で指定することができます。

```json
  "context": {
    "allowedIpV4AddressRanges": ["192.168.0.0/24"], // null から、許可 CIDR リストを指定することで有効化
    "allowedIpV6AddressRanges": ["2001:0db8::/32"], // null から、許可 CIDR リストを指定することで有効化
```


#### 地理的制限

Web アプリへのアクセスをアクセス元の国で制限したい場合、AWS WAF による地理的制限を有効化することができます。[packages/cdk/cdk.json](/packages/cdk/cdk.json) の `allowedCountryCodes` で許可する国を Country Code の配列で指定することができます。
指定する国の Country Code は[ISO 3166-2 from wikipedia](https://en.wikipedia.org/wiki/ISO_3166-2)をご参照ください。

「IP アドレスによる制限」も同時に設定している場合は、「送信元の IP アドレスが許可された IP アドレスに含まれている**かつ**、許可された国からのアクセス」のみ許可されます。

```json
  "context": {
    "allowedCountryCodes": ["JP"], // null から、許可国リストを指定することで有効化
```

`allowedIpV4AddressRanges` あるいは `allowedIpV6AddressRanges` あるいは `allowedCountryCodes` のいずれかを指定して再度 `npm run cdk:deploy` を実行すると、WAF 用のスタックが us-east-1 にデプロイされます（AWS WAF V2 は CloudFront に使用する場合、us-east-1 のみしか現状対応していません）。us-east-1 で CDK を利用したことがない場合は、以下のコマンドを実行して、デプロイ前に Bootstrap を行ってください。

```bash
npx -w packages/cdk cdk bootstrap --region us-east-1
```

### SAML 認証

Google Workspace や Microsoft Entra ID (旧 Azure Active Directory) などの IdP が提供する SAML 認証機能と連携ができます。次に詳細な連携手順があります。こちらもご活用ください。  
- [Google Workspace と SAML 連携](SAML_WITH_GOOGLE_WORKSPACE.md)
- [Microsoft Entra ID と SAML 連携](SAML_WITH_ENTRA_ID.md)

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**

```json
  "samlAuthEnabled": true,
  "samlCognitoDomainName": "your-preferred-name.auth.ap-northeast-1.amazoncognito.com",
  "samlCognitoFederatedIdentityProviderName": "EntraID",
```
- samlAuthEnabled : `true` にすることで、SAML 専用の認証画面に切り替わります。Cognito user pools を利用した従来の認証機能は利用できなくなります。
- samlCognitoDomainName : Cognito の App integration で設定する Cognito Domain 名を指定します。
- samlCognitoFederatedIdentityProviderName : Cognito の Sign-in experience で設定する Identity Provider の名前を指定します。


### ガードレール

Converse API を使う(=テキスト出力を行う生成 AI モデル)場合はガードレールを適用させることが可能です。設定するには `packages/cdk/cdk.json` の `guardrailEnabled` キーを `true` に変更、デプロイしなおします。
```json
  "context": {
    "guardrailEnabled" : true,
  }
```
デフォルトで適用されるガードレールは機微情報フィルターで日本語での会話の中で効果があったものを適用しています。他にも単語フィルターのカスタム、機微情報フィルターの正規表現は機能することを確認しており、必要に応じて、`packages/cdk/lib/construct/guardrail.ts` を修正してください。詳細は[Guardrails for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)と[CfnGuardrail](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnGuardrail.html)をご参照ください。

> [!NOTE]
> ガードレールの設定を有効後に、再度無効化する場合は、`guardrailEnabled: false` にして再デプロイすれば生成 AI を呼び出す際にガードレールは無効化されますが、ガードレール自体は残ります。マネージメントコンソールを開き、modelRegion の CloudFormation から `GuardrailStack` というスタックを削除することで完全に消去ができます。ガードレールが残ること自体にコストは発生しませんが、使用しないリソースは削除するのが望ましいです。

## コスト関連設定

### Kendraのインデックスを自動で作成・削除するスケジュールを設定する

GenerativeAiUseCasesDashboardStackで作成するKendraのインデックスを、決められたスケジュールで自動で作成・削除するための設定を行います。これによって、Kendraのインデックスを稼働時間に対して発生する利用料を抑えることができます。Kendraインデックスを作成した後は、本リポジトリでデフォルトで作成されるS3データソースに対して、同期を自動で実行します。

この機能は、「contextの `ragEnabled` が `true` 」かつ「contextの `kendraIndexArn` が `null` 」の場合にのみ有効で、それ以外の場合は機能しません。（つまり、外部で作成したKendraのインデックスに対しては機能しません）

以下の例のように設定してください。
* `kendraIndexScheduleEnabled`を`true`に設定することで、スケジュール設定を有効になり、`false`にした場合、その状態でデプロイした以降は、スケジュール設定が無効になります。
* `kendraIndexScheduleCreateCron`と`kendraIndexScheduleDeleteCron`には、作成開始時刻と削除開始時刻をCron形式で指定します。
  + Cron形式の詳細は[こちら](https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/events/ScheduledEvents.html)を参照してください。ただし、EventBridgeの仕様に合わせるため、UTC時間で指定してください。現状では、minute・hour・month・weekDayのみ指定可能です。これら項目は必ず指定する必要があり、それ以外の項目は指定しても無視されます。
  + `null`を設定した場合は、作成・削除が実行されません。片方を`null`のままにする（どちらかのみを設定する）ことも、両者を`null`にする（何も実行しない）ことも可能です。

下記の例は、日本時間の月～金08:00にインデックスの作成を開始し、日本時間の月～金の20:00にインデックスの削除を開始する場合の設定です。

 **[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集** 

```json
{
  "context": {
    "kendraIndexScheduleEnabled": true,
    "kendraIndexScheduleCreateCron": { "minute": "0", "hour": "23", "month": "*", "weekDay": "SUN-THU" },
    "kendraIndexScheduleDeleteCron": { "minute": "0", "hour": "11", "month": "*", "weekDay": "MON-FRI" },
  }
}
```

Kendraのインデックスが削除されても、RAG機能はオンのままです。Webアプリケーション（GenU）ではRAG関連のメニューは表示されたままです。RAGチャットを実行すると、インデックスが存在しないためエラーが発生し、エラーメッセージに「インデックス作成・削除のスケジュールを確認してください」という旨のテキストが表示されます。

スケジュールとしてEventBridgeルールを使用し、処理の制御としてStep Functionsを使用します。EventBridgeのルールを手動で無効化することでスケジュールを停止できます。また、Step Functionsのステートマシンを手動で実行することで、インデックスの作成・削除を行うことができます。

> [!NOTE]
> - インデックス再作成後、追加されるデータソースは、デフォルトで作成されるS3データソースのみです。
>   - インデックス作成後に他のデータソースを追加していた場合、インデックス削除時にデータソースも削除され、インデックスを再作成してもそれらのデータソースは作成されず、再度追加する必要があります。
>   - 本リポジトリのCDK内でデータソースを追加した場合、データソースの作成はされますが、同期はされません。CDKで追加したデータソースの同期を行うためには、手動でデータソースの同期を行うか、Step Functionsのステートマシンのターゲットとして追加するように[コード](../packages/cdk/lib/construct/rag.ts)を修正する必要があります。
> - Kendraのインデックス作成を開始してから、利用可能な状態になるまでには時間がかかります。具体的には、インデックスの作成と、データソースの同期に時間がかかります。そのため、 **RAGチャットの利用を開始したい時刻が決まっている場合、設定する起動時刻はそれよりも前に設定してください** 。リソースの空き状況・データソースの種類・データソース内のドキュメントのサイズ・数によって変動しますので、厳密な稼働時間を設定したい場合は、実際の所要時間を確認して設定するようにしてください。
>   - おおよその目安として、インデックスの作成には30分程度、S3データソースに数百件のテキストファイルを配置した場合、データソースの同期には10分程度かかります（あくまで目安です）。（この値に合わせるなら、40分前に設定する、ということになります。）
>   - 特に外部サービスをデータソースとして利用する場合は、所要時間が大きく変動することが予想されるため、注意してください。また、APIのコール制限などにも注意してください。
> - 上記の設定時間外にインデックスが停止されていることを保証するものではなく、あくまでスケジュールで起動・停止を実行するものです。デプロイやスケジュールのタイミングにご注意ください
>   - 例えば、20時に削除する設定を、21時にデプロイしても、その時点では削除されず、翌日の21時にならないと削除が開始されません。
>   - スタックを作成するとき（GenerativeAiUseCasesStackがない状態で、cdk:deployを実行したとき）は、`ragEnabled`が`true`の場合、Kendraインデックスが作成されます。スケジュールの時刻が設定されていても、作成されます。次の削除スケジュール時刻まで、インデックスは作成されたままです。
> - 現状では、起動・停止のエラーを通知する機能はありません。
> - インデックスを再作成するたびに、IndexIdやDataSourceIdが変わります。他のサービスなどから参照している場合は、その変更に対応する必要があります。

## モニタリング用のダッシュボードの有効化

入力/出力 Token 数や直近のプロンプト集などが集約されたダッシュボードを作成します。
**ダッシュボードは GenU に組み込まれたものではなく、Amazon CloudWatch のダッシュボードです。**
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

変更後に `npm run cdk:deploy` で再度デプロイして反映させます。context の `modelRegion` に指定されたリージョンに `GenerativeAiUseCasesDashboardStack` という名前の Stack がデプロイされます。出力された値はこの後の手順で利用します。

続いて、Amazon Bedrock のログの出力を設定します。[Amazon Bedrock の Settings](https://console.aws.amazon.com/bedrock/home#settings) を開き、Model invocation logging を有効化します。Select the logging destinations には CloudWatch Logs only を選択してください。(S3 にも出力したい場合、Both S3 and CloudWatch Logs を選択しても構いません。) また、Log group name には `npm run cdk:deploy` 時に出力された `GenerativeAiUseCasesDashboardStack.BedrockLogGroup` を指定してください。(例: `GenerativeAiUseCasesDashboardStack-LogGroupAAAAAAAA-BBBBBBBBBBBB`) Service role は任意の名前で新規に作成してください。なお、Model invocation logging の設定は、context で `modelRegion` として指定しているリージョンで行うことに留意してください。

設定完了後、`npm run cdk:deploy` 時に出力された `GenerativeAiUseCasesDashboardStack.DashboardUrl` を開いてください。

> [!NOTE]
> モニタリング用のダッシュボードを有効後に、再度無効化する場合は、`dashboard: false` にして再デプロイすればモニタリング用ダッシュボードは無効化されますが、`GenerativeAiUseCasesDashboardStack` 自体は残ります。マネージメントコンソールを開き、modelRegion の CloudFormation から `GenerativeAiUseCasesDashboardStack` というスタックを削除することで完全に消去ができます。

## カスタムドメインの使用

Web サイトの URL としてカスタムドメインを使用することができます。同一 AWS アカウントの Route53 にパブリックホストゾーンが作成済みであることが必要です。パブリックホストゾーンについてはこちらをご参照ください: [パブリックホストゾーンの使用 - Amazon Route 53](https://docs.aws.amazon.com/ja_jp/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)

同一 AWS アカウントにパブリックホストゾーンを持っていない場合は、AWS ACM による SSL 証明書の検証時に手動で DNS レコードを追加する方法や、Eメール検証を行う方法もあります。これらの方法を利用する場合は、CDK のドキュメントを参照してカスタマイズしてください: [aws-cdk-lib.aws_certificatemanager module · AWS CDK](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html)

cdk.json には以下の値を設定します。

- `hostName` ... Web サイトのホスト名です。A レコードは CDK によって作成されます。事前に作成する必要はありません
- `domainName` ... 事前に作成したパブリックホストゾーンのドメイン名です
- `hostedZoneId` ... 事前に作成したパブリックホストゾーンのIDです

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**

```json
{
  "context": {
    "hostName": "genai",
    "domainName": "example.com",
    "hostedZoneId": "XXXXXXXXXXXXXXXXXXXX"
  }
}
```

## 別 AWS アカウントの Bedrock を利用したい場合

> [!NOTE]
> Agent 系のタスク (Agent, Prompt Flow, プロンプト最適化ツール) に関しては別 AWS アカウントの利用をサポートしていないため、実行時にエラーになる可能性があります。

別 AWS アカウントの Bedrock を利用することができます。前提条件として、GenU の初回デプロイは完了済みとします。

別 AWS アカウントの Bedrock を利用するためには、別 AWS アカウントに IAM ロールを 1 つ作成する必要があります。作成する IAM ロール名は任意ですが、GenU デプロイ時に作成された以下の名前で始まる IAM ロール名を、別アカウントで作成した IAM ロールの Principal に指定します。

- `GenerativeAiUseCasesStack-APIPredictTitleService`
- `GenerativeAiUseCasesStack-APIPredictService`
- `GenerativeAiUseCasesStack-APIPredictStreamService`
- `GenerativeAiUseCasesStack-APIGenerateImageService`

Principal の指定方法について詳細を確認したい場合はこちらを参照ください: [AWS JSON ポリシーの要素: Principal](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/reference_policies_elements_principal.html)

Principal 設定例 (別アカウントにて設定)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIPredictTitleServiceXXX-XXXXXXXXXXXX",
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIPredictServiceXXXXXXXX-XXXXXXXXXXXX",
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIPredictStreamServiceXX-XXXXXXXXXXXX",
                    "arn:aws:iam::111111111111:role/GenerativeAiUseCasesStack-APIGenerateImageServiceXX-XXXXXXXXXXXX"
                ]
            },
            "Action": "sts:AssumeRole",
            "Condition": {}
        }
    ]
}
```

cdk.json には以下の値を設定します。

- `crossAccountBedrockRoleArn` ... 別アカウントで事前に作成した IAM ロールの ARN です

**[packages/cdk/cdk.json](/packages/cdk/cdk.json) を編集**

```json
{
  "context": {
    "crossAccountBedrockRoleArn": "arn:aws:iam::アカウントID:role/事前に作成したロール名"
  }
}
```

cdk.json 設定例

```json
{
  "context": {
    "crossAccountBedrockRoleArn": "arn:aws:iam::222222222222:role/YYYYYYYYYYYYYYYYYYYYY"
  }
}
```

設定変更後に `npm run cdk:deploy` を実行して変更内容を反映させます。
