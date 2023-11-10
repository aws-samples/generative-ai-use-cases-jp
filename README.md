> **This repository is optimized for Japanese.**

# Generative AI Use Cases JP

Generative AI（生成系 AI）は、ビジネスの変革に革新的な可能性をもたらします。このリポジトリでは、Generative AI を活用したビジネスユースケースをデモンストレーションしています。

![sc_lp.png](/imgs/sc_lp.png)

> **生成系AIの進化に伴い、破壊的な変更を加えることが多々あります。エラーが発生した際は、まず最初にmainブランチの更新がないかご確認ください。**

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
  <summary>画像生成</summary>

  画像生成 AI は、テキストや画像を元に新しい画像を生成できます。アイデアを即座に可視化することができ、デザイン作業などの効率化を期待できます。こちらの機能では、プロンプトの作成を LLM に支援してもらうことができます。

  <img src="/imgs/usecase_generate_image.gif"/>
</details>


## アーキテクチャ

このサンプルでは、フロントエンドは React を用いて実装し、静的ファイルは Amazon CloudFront + Amazon S3 によって配信されています。バックエンドには Amazon API Gateway + AWS Lambda、認証には Amazon Congito を使用しています。また、LLM は Amazon Bedrock を使用します。RAG のデータソースには Amazon Kendra を利用しています。

![arch.png](/imgs/arch.png)

## デプロイ

**このリポジトリでは、デフォルトでバージニア北部 (us-east-1) リージョンの Anthropic Claude モデルを利用する設定になっています。[Model access 画面](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) を開き、「Edit」 → 「Anthropic Claude にチェック」 → 「Save changes」 と操作していただいて、バージニア北部リージョンにて Amazon Bedrock (基盤モデル: Claude) を利用できる状態にしてください。Claude Instant を利用する場合など、設定を変える方法については [Amazon Bedrock の違うモデルを利用したい場合](/docs/BEDROCK.md) をご確認ください。**

アプリケーションは [AWS Cloud Development Kit](https://aws.amazon.com/jp/cdk/)（以降 CDK）を利用してデプロイします。CDK 環境の準備や、デプロイ手順の説明、セキュリティ機能の追加などを解説している [こちらのドキュメント](https://catalog.workshops.aws/generative-ai-use-cases-jp) で、より詳細な手順を確認できます。また、[こちらの動画](https://www.youtube.com/watch?v=9sMA17OKP1k)では、動画形式でもデプロイ手順を確認できます。

以下にデプロイ手順を記載します。

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

- [参考 (別のモデル or リージョンを利用したい場合)](/docs/BEDROCK.md)

### RAG 有効化

RAG のユースケースを試す場合は、RAG の有効化および Kendra の Data source を手動で Sync する必要があります。

まず、RAG を有効化して再デプロイします。
`packages/cdk/cdk.json` を開き、`context` の `ragEnabled` を `true` に変更します。
その後、以下のコマンドで再デプロイしてください。

```bash
npm run cdk:deploy
```

続いて、Kendra の Data source の Sync を以下の手順で行なってください。

1. [Amazon Kendra のコンソール画面](https://console.aws.amazon.com/kendra/home) を開く
1. generative-ai-use-cases-index をクリック
1. Data sources をクリック
1. WebCrawler をクリック
1. Sync now をクリック

Sync run history の Status / Summary に Completed が表示されれば完了です。AWS の Amazon Bedrock 関連のページをクローリングし、自動でドキュメントが追加されます。

### 画像生成の有効化

画像生成のユースケースをご利用になる際は、Stability AI の Stable Diffusion XL モデルを有効化する必要があります。[Model access 画面](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) を開き、「Edit」 → 「Stable Diffusion XL にチェック」 → 「Save changes」 と操作していただいて、バージニア北部リージョンにて Amazon Bedrock (基盤モデル: Stable Diffusion XL) を利用できる状態にしてください。なお、画像生成に関しては Stable Diffusion XL を有効化していない場合でもユースケースとして画面に表示されるため、注意してください。モデルを有効にしていない状態で実行するとエラーになります。

## その他のドキュメント
- デプロイのオプション
  - [Amazon Bedrock の違うモデル・リージョンを利用したい場合](/docs/BEDROCK.md)
  - [Amazon SageMaker を利用したい場合](/docs/SAGEMAKER.md)
  - [セキュリティ関連](/docs/SECURITY.md)
- 開発
  - [ローカル開発環境構築手順](/docs/DEVELOPMENT.md)
  - [ユースケースの追加方法 (ブログ: Amazon Bedrock で Interpreter を開発!)](https://aws.amazon.com/jp/builders-flash/202311/bedrock-interpreter/#04)
  - [リソースの削除方法](/docs/DESTROY.md)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

