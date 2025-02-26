# Generative AI Use Cases JP (略称:GenU)

## デプロイ

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
# 通常デプロイ
npm run cdk:deploy

# 高速デプロイ (作成されるリソースを事前確認せずに素早くデプロイ)
npm run cdk:deploy:quick
```

### ローカルのターミナル及び IdC でユーザー管理している場合

```bash
# デフォルトプロファイル（genai）を使用
./deploy-with-idc.sh

# または特定のプロファイルを指定
./deploy-with-idc.sh your-profile-name
```

権限問題でシェルスクリプトを実行できない場合、`chmod +x deploy-with-idc.sh` を実行

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
