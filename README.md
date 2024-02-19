> [!IMPORTANT]
> This repository is currently developed for Japanese users. If you wish for multilingual support, please react to [this issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues/151).

# Generative AI Use Cases JP

Generative AI（生成 AI）は、ビジネスの変革に革新的な可能性をもたらします。このリポジトリでは、Generative AI を活用したビジネスユースケースをデモンストレーションしています。

![sc_lp.png](/imgs/sc_lp.png)

> **生成AIの進化に伴い、破壊的な変更を加えることが多々あります。エラーが発生した際は、まず最初にmainブランチの更新がないかご確認ください。**

## ユースケース一覧

> ユースケースは随時追加予定です。ご要望があれば [Issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues) に起票をお願いいたします。

<details>
  <summary>チャット</summary>

  LLM とチャット形式で対話することができます。LLM と直接対話するプラットフォームが存在するおかげで、細かいユースケースや新しいユースケースに迅速に対応することができます。また、プロンプトエンジニアリングの検証用環境としても有効です。

  <img src="/imgs/usecase_chat.gif"/>
</details>

<details>
   <summary>RAG チャット</summary>

  RAG は LLM が苦手な最新の情報やドメイン知識を外部から伝えることで、本来なら回答できない内容にも答えられるようにする手法です。それと同時に、根拠に基づいた回答のみを許すため、LLM にありがちな「それっぽい間違った情報」を回答させないという効果もあります。例えば、社内ドキュメントを LLM に渡せば、社内の問い合わせ対応が自動化できます。このリポジトリでは Amazon Kendra から情報を取得しています。

  <img src="/imgs/usecase_rag.gif"/>
</details>

<details>
   <summary>Agent チャット</summary>

  Agent は LLM を API と連携することでさまざまなタスクを行えるようにする手法です。このソリューションではサンプル実装として検索エンジンを利用し必要な情報を調査して回答する Agent を実装しています。

  <img src="/imgs/usecase_agent.gif"/>
</details>

<details>
   <summary>文章生成</summary>

   あらゆるコンテキストで文章を生成することは LLM が最も得意とするタスクの 1 つです。記事・レポート・メールなど、あらゆるコンテキストに対応します。

  <img src="/imgs/usecase_generate_text.gif"/>
</details>

<details>
  <summary>要約</summary>

  LLM は、大量の文章を要約するタスクを得意としています。ただ要約するだけでなく、文章をコンテキストとして与えた上で、必要な情報を対話形式で引き出すこともできます。例えば、契約書を読み込ませて「XXX の条件は？」「YYY の金額は？」といった情報を取得することが可能です。

  <img src="/imgs/usecase_summarize.gif"/>
</details>

<details>
  <summary>校正</summary>

  LLM は、誤字脱字のチェックだけでなく、文章の流れや内容を考慮したより客観的な視点から改善点を提案できます。人に見せる前に LLM に自分では気づかなかった点を客観的にチェックしてもらいクオリティを上げる効果が期待できます。

  <img src="/imgs/usecase_editorial.gif"/>
</details>

<details>
  <summary>翻訳</summary>

  多言語で学習した LLM は、翻訳を行うことも可能です。また、ただ翻訳するだけではなく、カジュアルさ・対象層など様々な指定されたコンテキスト情報を翻訳に反映させることが可能です。

  <img src="/imgs/usecase_translate.gif"/>
</details>

<details>
  <summary>Web コンテンツ抽出</summary>

  ブログやドキュメントなどの Web コンテンツを抽出します。LLM によって不要な情報はそぎ落とし、成立した文章として整形します。抽出したコンテンツは要約、翻訳などの別のユースケースで利用できます。

  <img src="/imgs/usecase_web_content.gif"/>
</details>


<details>
  <summary>画像生成</summary>

  画像生成 AI は、テキストや画像を元に新しい画像を生成できます。アイデアを即座に可視化することができ、デザイン作業などの効率化を期待できます。こちらの機能では、プロンプトの作成を LLM に支援してもらうことができます。

  <img src="/imgs/usecase_generate_image.gif"/>
</details>


## アーキテクチャ

このサンプルでは、フロントエンドは React を用いて実装し、静的ファイルは Amazon CloudFront + Amazon S3 によって配信されています。バックエンドには Amazon API Gateway + AWS Lambda、認証には Amazon Congito を使用しています。また、LLM は Amazon Bedrock を使用します。RAG のデータソースには Amazon Kendra を利用しています。

![arch.drawio.png](/imgs/arch.drawio.png)

## デプロイ

> [!IMPORTANT]
> このリポジトリでは、デフォルトでバージニア北部リージョン (us-east-1) の Anthropic Claude モデルを利用する設定になっています。[Model access 画面 (us-east-1)](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess)を開き、Anthropic Claude にチェックして Save changes してください。Claude Instant を利用する場合など、設定を変更する方法については [Amazon Bedrock のモデルを変更する](/docs/DEPLOY_OPTION.md#amazon-bedrock-のモデルを変更する) を参照してください。

アプリケーションは [AWS Cloud Development Kit](https://aws.amazon.com/jp/cdk/)（以降 CDK）を利用してデプロイします。Step-by-Step の解説、あるいは、別のデプロイ手段を利用する場合は以下を参照してください。
- [Workshop](https://catalog.workshops.aws/generative-ai-use-cases-jp)
- [動画によるデプロイ手順の紹介](https://www.youtube.com/watch?v=9sMA17OKP1k)

まず、以下のコマンドを実行してください。全てのコマンドはリポジトリのルートで実行してください。

```bash
npm ci
```

CDK を利用したことがない場合、初回のみ [Bootstrap](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/bootstrapping.html) 作業が必要です。すでに Bootstrap された環境では以下のコマンドは不要です。

```bash
npx -w packages/cdk cdk bootstrap
```

続いて、以下のコマンドで AWS リソースをデプロイします。デプロイが完了するまで、お待ちください（20 分程度かかる場合があります）。

```bash
npm run cdk:deploy
```

## [デプロイオプション](/docs/DEPLOY_OPTION.md)
- [設定方法](/docs/DEPLOY_OPTION.md#設定方法)
  - [cdk.json の値を変更する方法](/docs/DEPLOY_OPTION.md#cdkjson-の値を変更する方法)
- [ユースケースの設定](/docs/DEPLOY_OPTION.md#ユースケースの設定)
  - [RAG チャットユースケースの有効化](/docs/DEPLOY_OPTION.md#rag-チャットユースケースの有効化)
    - [既存の Amazon Kendra Index を利用したい場合](/docs/DEPLOY_OPTION.md#既存の-amazon-kendra-index-を利用したい場合)
  - [Agent チャットユースケースの有効化](/docs/DEPLOY_OPTION.md#agent-チャットユースケースの有効化)
    - [検索エージェントのデプロイ](/docs/DEPLOY_OPTION.md#検索エージェントのデプロイ)
    - [Knowledge base エージェントのデプロイ](/docs/DEPLOY_OPTION.md#knowledge-base-エージェントのデプロイ)
- [Amazon Bedrock のモデルを変更する](/docs/DEPLOY_OPTION.md#amazon-bedrock-のモデルを変更する)
  - [us-east-1 (バージニア) の Amazon Bedrock のモデルを利用する例](/docs/DEPLOY_OPTION.md#us-east-1-バージニア-の-amazon-bedrock-のモデルを利用する例)
  - [ap-northeast-1 (東京) の Amazon Bedrock のモデルを利用する例](/docs/DEPLOY_OPTION.md#ap-northeast-1-東京-の-amazon-bedrock-のモデルを利用する例)
- [Amazon SageMaker のカスタムモデルを利用したい場合](/docs/DEPLOY_OPTION.md#amazon-sagemaker-のカスタムモデルを利用したい場合)
  - [Rinna 3.6B と Bilingual Rinna 4B を利用する例](/docs/DEPLOY_OPTION.md#rinna-36b-と-bilingual-rinna-4b-を利用する例)
  - [ELYZA-japanese-Llama-2-7b-instruct を利用する例](/docs/DEPLOY_OPTION.md#elyza-japanese-llama-2-7b-instruct-を利用する例)
- [セキュリティ関連設定](/docs/DEPLOY_OPTION.md#セキュリティ関連設定)
  - [セルフサインアップを無効化する](/docs/DEPLOY_OPTION.md#セルフサインアップを無効化する)
  - [サインアップできるメールアドレスのドメインを制限する](/docs/DEPLOY_OPTION.md#サインアップできるメールアドレスのドメインを制限する)
  - [AWS WAF による制限を有効化する](/docs/DEPLOY_OPTION.md#aws-waf-による制限を有効化する)
    - [IP 制限](/docs/DEPLOY_OPTION.md#IP-アドレスによる制限)
    - [地理的制限](/docs/DEPLOY_OPTION.md#地理的制限)
  - [SAML 認証](/docs/DEPLOY_OPTION.md#SAML-認証)
- [モニタリング用のダッシュボードの有効化](/docs/DEPLOY_OPTION.md#モニタリング用のダッシュボードの有効化)
- [ファイルアップロード機能の有効化](/docs/DEPLOY_OPTION.md#ファイルアップロード機能の有効化)

## その他
 - [アップデート方法](/docs/UPDATE.md)
 - [ローカル開発環境構築手順](/docs/DEVELOPMENT.md)
 - [リソースの削除方法](/docs/DESTROY.md)

## 参照
 - [ブログ: Generative AI Use Cases JP をカスタマイズする方法](https://aws.amazon.com/jp/blogs/news/how-to-generative-ai-use-cases-jp/)
 - [ブログ: Amazon Bedrock で Interpreter を開発!](https://aws.amazon.com/jp/builders-flash/202311/bedrock-interpreter/)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

