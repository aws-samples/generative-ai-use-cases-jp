> [!IMPORTANT]
> This repository is currently developed for Japanese users. If you wish for multilingual support, please react to [this issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues/151).

# Generative AI Use Cases JP (略称:GenU)

Generative AI（生成 AI）は、ビジネスの変革に革新的な可能性をもたらします。GenU は、生成 AI を安全に業務活用するための、ビジネスユースケース集を備えたアプリケーション実装です。

![sc_lp.png](/imgs/sc_lp.png)

このリポジトリではブラウザ拡張機能も提供しており、より便利に 生成 AI を活用することができます。詳しくは[こちらのページ](/browser-extension/README.md)をご覧ください。

> **生成AIの進化に伴い、破壊的な変更を加えることが多々あります。エラーが発生した際は、まず最初にmainブランチの更新がないかご確認ください。**

## ユースケース一覧

> ユースケースは随時追加予定です。ご要望があれば [Issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues) に起票をお願いいたします。

<details>
  <summary>チャット</summary>

  大規模言語モデル (LLM) とチャット形式で対話することができます。LLM と直接対話するプラットフォームが存在するおかげで、細かいユースケースや新しいユースケースに迅速に対応することができます。また、プロンプトエンジニアリングの検証用環境としても有効です。

  <img src="/imgs/usecase_chat.gif"/>
</details>

<details>
   <summary>RAG チャット</summary>

  RAG は LLM が苦手な最新の情報やドメイン知識を外部から伝えることで、本来なら回答できない内容にも答えられるようにする手法です。それと同時に、根拠に基づいた回答のみを許すため、LLM にありがちな「それっぽい間違った情報」を回答させないという効果もあります。例えば、社内ドキュメントを LLM に渡せば、社内の問い合わせ対応が自動化できます。このリポジトリでは Amazon Kendra か Knowledge Base から情報を取得します。

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


<details>
  <summary>映像分析</summary>

  マルチモーダルモデルによってテキストのみではなく、画像を入力することが可能になりました。こちらの機能では、映像の画像フレームとテキストを入力として LLM に分析を依頼します。

  <img src="/imgs/usecase_video_analyzer.gif"/>
</details>


## アーキテクチャ

この実装では、フロントエンドに React を採用し、静的ファイルは Amazon CloudFront + Amazon S3 によって配信されています。バックエンドには Amazon API Gateway + AWS Lambda、認証には Amazon Congito を使用しています。また、LLM は Amazon Bedrock を使用します。RAG のデータソースには Amazon Kendra を利用しています。

![arch.drawio.png](/imgs/arch.drawio.png)

## デプロイ

> [!IMPORTANT]
> このリポジトリでは、デフォルトのモデルとしてバージニア北部リージョン (us-east-1) の Anthropic Claude 3 Sonnet (テキスト生成)と、Stability AI の SDXL 1.0(画像生成) を利用する設定になっています。[Model access 画面 (us-east-1)](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess)を開き、Anthropic Claude 3 Sonnet にチェックして Save changes してください。その他のモデル (Anthropic Claude 3 Haiku, Meta Llama3, Cohere Command-R など) を利用するために設定を変更する方法については [Amazon Bedrock のモデルを変更する](/docs/DEPLOY_OPTION.md#amazon-bedrock-のモデルを変更する) を参照してください。

GenU のデプロイには [AWS Cloud Development Kit](https://aws.amazon.com/jp/cdk/)（以降 CDK）を利用します。Step-by-Step の解説、あるいは、別のデプロイ手段を利用する場合は以下を参照してください。
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
  - [RAG チャット (Amazon Kendra) ユースケースの有効化](/docs/DEPLOY_OPTION.md#rag-チャット-amazon-kendra-ユースケースの有効化)
    - [既存の Amazon Kendra Index を利用したい場合](/docs/DEPLOY_OPTION.md#既存の-amazon-kendra-index-を利用したい場合)
  - [RAG チャット (Knowledge Base) ユースケースの有効化](/docs/DEPLOY_OPTION.md#rag-チャット-knowledge-base-ユースケースの有効化)
    - [embeddingModelId の変更等、OpenSearch Service の Index に変更を加える方法](/docs/DEPLOY_OPTION.md#embeddingmodelid-の変更等opensearch-service-の-index-に変更を加える方法)
    - [OpenSearch Service の Collection/Index に変更を加える方法](/docs/DEPLOY_OPTION.md#opensearch-service-の-collectionindex-に変更を加える方法)
  - [Agent チャットユースケースの有効化](/docs/DEPLOY_OPTION.md#agent-チャットユースケースの有効化)
    - [検索エージェントのデプロイ](/docs/DEPLOY_OPTION.md#検索エージェントのデプロイ)
    - [Knowledge base エージェントのデプロイ](/docs/DEPLOY_OPTION.md#knowledge-base-エージェントのデプロイ)
  - [映像分析ユースケースの有効化](/docs/DEPLOY_OPTION.md#映像分析ユースケースの有効化)
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
- [コスト関連設定](/docs/DEPLOY_OPTION.md#コスト関連設定)
  - [Kendraのインデックスを自動で作成・削除するスケジュールを設定する](/docs/DEPLOY_OPTION.md#Kendraを自動でオン・オフするスケジュールを設定する)
- [モニタリング用のダッシュボードの有効化](/docs/DEPLOY_OPTION.md#モニタリング用のダッシュボードの有効化)
- [ファイルアップロード機能の有効化](/docs/DEPLOY_OPTION.md#ファイルアップロード機能の有効化)
- [別 AWS アカウントの Bedrock を利用したい場合](/docs/DEPLOY_OPTION.md#別-AWS-アカウントの-Bedrock-を利用したい場合)

## その他
 - [アップデート方法](/docs/UPDATE.md)
 - [ローカル開発環境構築手順](/docs/DEVELOPMENT.md)
 - [リソースの削除方法](/docs/DESTROY.md)
 - [AWS 上で完結するデプロイ方法 (手元に環境を用意することが難しい場合)](/docs/DEPLOY_ON_AWS.md)
 - [ネイティブアプリのように利用する方法](/docs/PWA.md)
 - [ブラウザ拡張機能を利用する](/browser-extension/README.md)

## 料金試算
[GenU をご利用いただく際の、構成と料金試算例](https://aws.amazon.com/jp/cdp/ai-chatapp/)を公開しております。  
この料金試算例は、Amazon Kendra を活用した RAG チャット機能を有効化する前提となっています。
セキュリティ強化のための AWS WAF や、ファイルのアップロード機能、Knowledge Base を活用したオプション機能などは含まれていない点にご注意ください。
従量課金制となっており、実際の料金はご利用内容により変動いたします。

## お客様事例

### [株式会社やさしい手](https://www.yasashiite.com/)

![yasashiite_logo.png](/imgs/株式会社やさしい手_ロゴ.png)
GenUを活用した介護現場の記録・報告業務の効率化。介護利用者の家族や医師、ケアマネージャーが読みやすい報告業務の自動化を実現。介護記録データから個別作業手順の生成や自動更新を行ったり、ケアマネージャーと利用者の会話音声から標準項目に沿ったケアプランの作成を行う。中堅・中小企業向け事業戦略に関する[説明会](https://japan.zdnet.com/article/35221718/)に登壇。

### [株式会社サルソニード](https://salsonido.com/)

![salsonido.png](/imgs/株式会社サルソニード_事例.png)
マーケターの記事執筆支援に GenU を活用。専門知識を持ったうえで記事の執筆が必要であり、記事制作に時間・人・スキルの面で課題があった。GenU の RAG を利用し、情報をもとに記事を作成することで課題を克服。リライト業務にかける時間を 70% 削減した。

### [株式会社タムラ製作所](https://www.tamura-ss.co.jp/jp/index.html)

![tamura.png](/imgs/株式会社タムラ製作所_事例.png)
製品の実験を行うにあたり、大量の製品書類があり必要な情報がどの文書に記載されているか特定が困難であるという課題があった。GenU の RAG を活用することで、文書の発見を容易にした。加えて、文字起こしや文書生成も活用し、議事録を簡単に作成できるようになったことで、情報の共有が活発化した。

### [株式会社JDSC](https://jdsc.ai/)

![jdsc.png](/imgs/株式会社JDSC_事例.png)
GenU をリファレンスにし、Bedrock の生成AI の出力を実際にアプリケーションで確認しつつ、開発できたことが成功要因でした。海事産業特有の専門的な問合せについて、90%以上の性能改善ができたのは、Haiku, Sonnet, Opus の適宜の利用と、AWSの各種サービス活用によります。特に性能向上の観点で新たにSonnet 3.5 への適用、 Kendra から RDS for PostgreSQL の pgvector への切替など、確固たるGenUのベースと自社ノウハウを両立させられたのも良かったです。

活用頂いた事例を掲載頂ける場合は、[Issue](https://github.com/aws-samples/generative-ai-use-cases-jp/issues)よりご連絡ください。


## 参照
 - [ブログ: Generative AI Use Cases JP をカスタマイズする方法](https://aws.amazon.com/jp/blogs/news/how-to-generative-ai-use-cases-jp/)
 - [ブログ: Amazon Bedrock で Interpreter を開発!](https://aws.amazon.com/jp/builders-flash/202311/bedrock-interpreter/)
 - [ブログ: 無茶振りは生成 AI に断ってもらおう ~ ブラウザに生成 AI を組み込んでみた ~](https://aws.amazon.com/jp/builders-flash/202405/genai-sorry-message/)
 - [ブログ: RAG チャットで精度向上のためのデバッグ方法](https://qiita.com/sugimount-a/items/7ed3c5fc1eb867e28566)
 - [動画： 生成 AI ユースケースを考え倒すための Generative AI Use Cases JP (GenU) の魅力と使い方](https://www.youtube.com/live/s1P5A2SIWgc?si=PBQ4ZHQXU4pDhL8A)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

