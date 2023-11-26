# Amazon Bedrock の違うモデルを利用したい場合

このソリューションはデフォルトでモデルをデプロイしたリージョンのモデルを利用します。

CDK Deploy 時のパラメータもしくは `packages/cdk/cdk.json` で Context として指定することでリージョンを変更することが可能です。

```bash
npm run cdk:deploy -- -c modelRegion=<Region>
```

## デプロイの例

**ap-northeast-1 (東京) のモデル利用する**

> **現状、モデルのリージョン (modelRegion) として 東京 (ap-northeast-1) を指定した場合、画像生成のユースケースは利用できません。東京リージョンの Amazon Bedrock で Stable Diffusion XL モデルがサポートされ次第、利用可能になります。**

```bash
npm run cdk:deploy -- -c modelRegion=ap-northeast-1
```

**us-east-1 (バージニア) のモデルを利用する**

```bash
npm run cdk:deploy -- -c modelRegion=us-east-1
```
