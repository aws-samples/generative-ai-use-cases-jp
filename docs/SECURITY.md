## セルフサインアップを無効化する

このソリューションはデフォルトでセルフサインアップが有効化してあります。セルフサインアップを無効にするには、[cdk.json](./packages/cdk/cdk.json)を開き、`selfSignUpEnabled` を `false` に切り替えてから再デプロイしてください。

```json
  "context": {
    "ragEnabled": false,
    "selfSignUpEnabled": true, // true -> false で無効化
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true, 
```