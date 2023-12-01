# 既存の Amazon Kendra Index を利用したい場合

> 既存の Amazon Kendra Index を利用する場合も、`packages/cdk/cdk.json` の `ragEnabled` は `true` である必要があります。

既存の Amazon Kendra Index を利用する場合、`packages/cdk/cdk.json` の `kendraArn` に Index の ARN を指定します。

ARN は以下のような形式です。(`<>` で囲まれた箇所は置き換えが必要です。)

```
arn:aws:kendra:<Region>:<AWS Account ID>:index/<Index ID>
```

具体的には以下のような文字列です。

```
arn:aws:kendra:ap-northeast-1:333333333333:index/77777777-3333-4444-aaaa-111111111111
```

ARN を `packages/cdk/cdk.json` に設定した後、以下のコマンドでデプロイして反映させます。

```bash
npm run cdk:deploy
```

あるいは、`packages/cdk/cdk.json` の値は変更せず、デプロイ時に `-c` オプションで指定することも可能です。

```bash
npm run cdk:deploy -- -c kendraArn=arn:aws:kendra:<Region>:<AWS Account ID>:index/<Index ID>
```
