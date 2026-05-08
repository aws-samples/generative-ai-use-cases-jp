# AWS CloudShell を利用した削除方法 (手元の環境を用意することが難しい場合)

## 概要

GenU を削除する際は、通常デプロイした環境とそこにある設定ファイルを基に削除を行います。ただ、ワンクリックや検証用デプロイなどによりそれらが手元にない場合、本スクリプトで手早く削除を行えます。

## CloudShell の起動

[CloudShell](https://console.aws.amazon.com/cloudshell/home) を起動します。

デプロイ時に使用した `cdk.json` や `parameter.ts` がある場合は、CloudShell のターミナル右上にある "Actions" のドロップダウンリストから "Upload file" を選びファイルをアップロードしてください。

## `destroy.sh` のダウンロードと実行権限の付与

CloudShell 上で以下のコマンドを実行し、`destroy.sh` というスクリプトをダウンロードします。
また、ダウンロード後に `destroy.sh` に実行権限を付与しています。

```bash
wget https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases/refs/heads/main/destroy.sh -O destroy.sh
chmod +x destroy.sh
```

## `destroy.sh` の実行

`destroy.sh` は以下のオプションをサポートしています。

```bash
-c, --cdk-context    ... Path to the cdk.json file
-p, --parameter-file ... Path to the parameter.ts file
-e, --env           ... Environment name (e.g., dev, prod)
-y, --yes           ... Skip confirmation prompt
-h, --help          ... Show this message
```

`cdk.json`、また `parameter.ts` が指定されない場合はデプロイ済みの GenU 関連スタックからパラメーターを推定し `cdk.json` を作成します。パラメーターの推定方法は、`setup-env.sh` に倣い次の手順で推定します。

1. デプロイされている `GenerativeAiUseCasesStack*` を検索
2. CloudFormation の出力から設定情報を取得
3. 必要最小限の cdk.json を自動生成
4. すべての関連スタックを削除

### 削除例

以下のコマンドで destroy.sh を実行します。

#### 1. 自動検出で削除

デプロイされたスタックから自動的に設定を復元して削除します。設定ファイルがない場合はこの方法を使用してください。

```bash
./destroy.sh
```

環境を分けている場合は ` --env` を設定してください

```bash
./destroy.sh --env dev
```

確認プロンプトが表示されるので、`yes` と入力して削除を実行します。確認をスキップして実行したい場合次のように実行してください。

```bash
./destroy.sh --env dev --yes
```

#### 2. カスタマイズした cdk.json を使用して削除

デプロイ時に使用した cdk.json がある場合：

```bash
./destroy.sh --cdk-context ~/cdk.json
```

#### 3. カスタマイズした parameter.ts を使用して削除

デプロイ時に使用した parameter.ts がある場合：

```bash
./destroy.sh --parameter-file ~/parameter.ts
```

#### 4. \*\*parameter.ts と環境を指定して削除

```bash
./destroy.sh --parameter-file ~/parameter.ts --env prod
```

### 注意事項

- 削除操作は取り消すことができません
- 削除前に必ず確認プロンプトが表示されます（`--yes` オプションを使用しない限り）
- すべての関連リソース（S3 バケット、DynamoDB テーブル、Lambda 関数など）が削除されます
- データのバックアップが必要な場合は、削除前に取得してください
