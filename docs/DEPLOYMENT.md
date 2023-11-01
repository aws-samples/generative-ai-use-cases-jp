## RAG 有効化

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

## 画像生成の有効化

画像生成のユースケースをご利用になる際は、Stability AI の Stable Diffusion XL モデルを有効化する必要があります。[Model access 画面](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess) を開き、「Edit」 → 「Stable Diffusion XL にチェック」 → 「Save changes」 と操作していただいて、バージニア北部リージョンにて Amazon Bedrock (基盤モデル: Stable Diffusion XL) を利用できる状態にしてください。なお、画像生成に関しては Stable Diffusion XL を有効化していない場合でもユースケースとして画面に表示されるため、注意してください。モデルを有効にしていない状態で実行するとエラーになります。

## セルフサインアップを無効化する

このソリューションはデフォルトでセルフサインアップが有効化してあります。セルフサインアップを無効にするには、[cdk.json](./packages/cdk/cdk.json)を開き、`selfSignUpEnabled` を `false` に切り替えてから再デプロイしてください。

```json
  "context": {
    "ragEnabled": false,
    "selfSignUpEnabled": true, // true -> false で無効化
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true, 
```