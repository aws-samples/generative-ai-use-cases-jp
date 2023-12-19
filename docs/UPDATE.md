# アップデート手順

## `git pull` で変更を取り込む

以下のコマンドを実行して、main ブランチの内容を取り込んでください。

```bash
git pull
```

> アセットをカスタマイズしている場合、コンフリクトが発生する可能性があります。
> コンフリクトが発生した場合は、該当のファイルを開き、両者の内容を取り込んだ変更を適用してください。

CodeCommit 等でアセットを管理している場合、GitHub のリモートリポジトリが `origin` 以外の名前で登録されている可能性があります。
リモートリポジトリ名は以下のコマンドで確認できます。

```bash
git remote -v
```

例として、GitHub のリモートリポジトリが `hoge` という名前で登録されている場合は、以下のような出力になります。

```
origin  codecommit://... (fetch)
origin  codecommit://... (push)
hoge  https://github.com/aws-samples/generative-ai-use-cases-jp (fetch)
hoge  https://github.com/aws-samples/generative-ai-use-cases-jp (push)
```

この場合は、リモートリポジトリを指定しつつ pull を実行します。

```bash
# hoge (= GitHub のリポジトリ) の main ブランチを取り込む
git pull hoge main
```

## cdk.json を確認する

[packages/cdk/cdk.json](/packages/cdk/cdk.json) を開き、設定した内容に変更がないか確認します。

## パッケージの更新を行う

以下のコマンドで更新します。

```bash
npm ci
```

## デプロイする

以下のコマンドでデプロイします。

```bash
npm run cdk:deploy
```
