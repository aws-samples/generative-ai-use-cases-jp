# AWS CloudShell を利用したデプロイ方法 (手元の環境を用意することが難しい場合)

## cdk.json の編集

GenU では cdk.json の context 以下をカスタマイズすることで、デプロイオプションを指定できます。
利用可能なデプロイオプションについては [デプロイオプション](/docs/DEPLOY_OPTION.md) をご参照ください。
一旦、[デフォルトの cdk.json](/packages/cdk/cdk.json) で構わないという場合は、こちらの手順をスキップしていただいて構いません。

デプロイオプションを指定する場合は、[デフォルトの cdk.json](/packages/cdk/cdk.json) をダウンロード (GitHub ページ右上のダウンロードボタンからファイルをダウンロードできます) し、context 以下を変更してファイルを保存してください。

## CloudShell の起動

[CloudShell](https://console.aws.amazon.com/cloudshell/home) を起動します。
前述した手順で cdk.json をカスタマイズした場合は、右上 Actions の Upload file からカスタマイズした cdk.json をアップロードしてください。

## deploy.sh のダウンロードと実行権限の付与

CloudShell 上で以下のコマンドを実行し、`deploy.sh` というスクリプトをダウンロードします。
また、ダウンロード後に deploy.sh に実行権限を付与しています。

```bash
wget https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases-jp/refs/heads/main/deploy.sh -O deploy.sh
chmod +x deploy.sh
```

## deploy.sh の実行

以下のコマンドで `deploy.sh` を実行します。
なお、`--cdk-context` オプションでカスタマイズした cdk.json へのパスを指定しています。(特に何もせず前述した手順で Upload files した場合はこのパスになります。)
cdk.json が別のパスにある場合は、適宜引数の値を変更してください。

```bash
./deploy.sh --cdk-context ~/cdk.json
```

なお、cdk.json のカスタマイズが必要ない場合は `--cdk-context` の指定は不要です。
その場合、[デフォルトの cdk.json](/packages/cdk/cdk.json) の設定でデプロイされます。

```bash
./deploy.sh
```

デプロイ途中に確認プロンプトが表示されるので、`y` と入力して Enter して進めてください。
デプロイ完了時に CloudFront の URL が表示されます。その URL をブラウザで開くことで GenU にアクセスできます。

なお、これらの手順を実行する場合も [Amazon Bedrock の Model access](https://console.aws.amazon.com/bedrock/home#/modelaccess) から利用するモデルの有効化が必要です。
デフォルトの cdk.json を使っている場合は、[デフォルトの cdk.json](/packages/cdk/cdk.json) の modelRegion において modelIds と imageGenerationModelIds で指定されたモデルが有効化されているかを確認してください。
