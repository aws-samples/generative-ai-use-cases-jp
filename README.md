> **This repository is optimized for Japanese.**

# Generative AI Use Cases JP

Generative AI（生成系 AI）は、ビジネスの変革に革新的な可能性をもたらします。このリポジトリでは、Generative AI を活用したビジネスユースケースをデモンストレーションしています。

![sc_lp.png](/imgs/sc_lp.png)

**このリポジトリでは、デフォルトでバージニア北部 (us-east-1) リージョンの Anthropic Claude モデルを利用する設定になっています。[Model access 画面](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) を開き、「Edit」 → 「Anthropic Claude にチェック」 → 「Save changes」 と操作していただいて、バージニア北部リージョンにて Amazon Bedrock (基盤モデル: Claude) を利用できる状態にしてください。東京リージョンのモデルを利用する場合など、設定を変える方法については [モデル・リージョンの切り替え](#モデルリージョンの切り替え) をご確認ください。**

## 機能一覧

> :white_check_mark: ... 実装されている、:construction: ... まだ実装されていない

- :white_check_mark: Amazon Bedrock を LLM として利用
- :white_check_mark: Amazon Bedrock Fine-tuning 用のデータ収集
- :construction: Amazon Bedrock Fine-tuning 用データのラベリング
- :construction: Amazon Bedrock Fine-tuning の実行

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
  <summary>要約</summary>

  LLM は、大量の文章を要約するタスクを得意としています。ただ要約するだけでなく、文章をコンテキストとして与えた上で、必要な情報を対話形式で引き出すこともできます。例えば、契約書を読み込ませて「XXX の条件は？」「YYY の金額は？」といった情報を取得することが可能です。

  <img src="/imgs/usecase_summarize.gif"/>
</details>

<details>
  <summary>校正</summary>

  LLM は、文章の誤字脱字だけでなく文章を理解し改善点を指摘することが可能です。自分が書いたレポートを人に見せる前に LLM に自分では気づかなかった点を客観的に指摘してもらいクオリティを上げる効果が期待できます。

  <img src="/imgs/usecase_editorial.gif"/>
</details>

<details>
  <summary>メール作成</summary>

  ビジネスメールの作成を日常的に行う人々は、形式的な挨拶や敬語の繰り返しではなく、メールの内容に集中したいと考えているでしょう。LLM を使用することで、そのような冗長なタスクを極力減らし、ルーチンワークにかかる時間を大幅に削減することが可能です。さらに、単に補完するだけでなく、誤字脱字の防止という効果も期待できます。

  <img src="/imgs/usecase_mail.gif"/>
</details>

<details>
  <summary>情報抽出</summary>

  文章を LLM に読み込ませることで、必要な情報を抽出できます。LLM は文章を的確に理解し、文体に気を使うことなく情報を抽出することが可能です。

  <img src="/imgs/usecase_extract.gif"/>
</details>

<details>
  <summary>CS 業務効率化</summary>

  人々が手動で処理する必要のある多数の問い合わせに対しても、LLM の活用が可能です。例えば、お客様からの問い合わせに対して「OK」や「無理です」といった単純な返答から、「承知いたしました。直ちに対応いたします。」や「申し訳ございません。お客様のプランではその機能の有効化はできません。」などの表現への変換が可能です。お客様からの問い合わせ内容をコンテキストとすることで、適切な文章へと変換することができます。さらに、Fine-tuning することで、「OK」や「無理です」といった返答を打つ必要がなくなる可能性もあります。(現在、このリポジトリでは Fine-tuning はサポートされていません。Amazon Bedrock 及びその Fine-tuning 機能のリリースが完了次第、対応を予定しています。)

  <img src="/imgs/usecase_cs.gif"/>
</details>

## アーキテクチャ

このサンプルでは、フロントエンドは React を用いて実装し、静的ファイルは Amazon CloudFront + Amazon S3 によって配信されています。バックエンドには Amazon API Gateway + AWS Lambda、認証には Amazon Congito を使用しています。また、LLM は Amazon Bedrock を使用します。RAG のデータソースには Amazon Kendra を利用しています。

![arch.png](/imgs/arch.png)

## デプロイ

[AWS Cloud Development Kit](https://aws.amazon.com/jp/cdk/)（以降 CDK）を利用してデプロイします。最初に、npm パッケージをインストールしてください。なお、全てのコマンドはルートディレクトリで実行してください。

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

RAG のユースケースを試す場合は、Kendra の Data source を手動で Sync する必要があります。以下の手順で行なってください。

1. [Amazon Kendra のコンソール画面](https://console.aws.amazon.com/kendra/home) を開く
1. generative-ai-use-cases-index をクリック
1. Data sources をクリック
1. WebCrawler をクリック
1. Sync now をクリック

Sync run history の Status / Summary に Completed が表示されれば完了です。AWS の Amazon Bedrock 関連のページをクローリングし、自動でドキュメントが追加されます。

## モデル・リージョンの切り替え

- デフォルトでは `us-east-1` の `anthropic.claude-v2` を利用しています。異なる設定を利用したい場合は [/docs/BEDROCK.md](docs/BEDROCK.md) をご確認ください。
- Amazon Bedrock ではなく Amazon SageMaker にデプロイしたカスタムモデルを使うことも可能です。詳細は [/docs/SAGEMAKER.md](docs/SAGEMAKER.md) をご確認ください。

## Pull Request を出す場合

バグ修正や機能改善などの Pull Request は歓迎しております。コミットする前に、lint ツールを実行してください。

```bash
npm run lint
```

また、ローカル環境の構築手順については [/docs/DEVELOPMENT.md](/docs/DEVELOPMENT.md) をご確認ください。

## 動画でデプロイ手順とデモンストレーションを紹介

動画でデプロイ手順とデモンストレーションをご覧いただけます。以下のサムネイルをクリックして再生してください。なおデプロイ手順につきましては、詳細な手順を後述しております。

| **デプロイ手順**                                                                                             | **デモンストレーション**                                                                             |
|--------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| [![デプロイ手順](https://img.youtube.com/vi/9sMA17OKP1k/0.jpg)](https://www.youtube.com/watch?v=9sMA17OKP1k) | [![デモ](https://img.youtube.com/vi/rkKZZSuVZUU/0.jpg)](https://www.youtube.com/watch?v=rkKZZSuVZUU) |

> 情報が古くなっている可能性があります。最新の手順については README.md をご確認ください。

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

