## セルフサインアップを無効化する

このソリューションはデフォルトでセルフサインアップが有効化してあります。セルフサインアップを無効にするには、[cdk.json](./packages/cdk/cdk.json)を開き、`selfSignUpEnabled` を `false` に切り替えてから再デプロイしてください。

```json
  "context": {
    "ragEnabled": false,
    "selfSignUpEnabled": true, // true -> false で無効化
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true, 
```

## AWS WAF による IP 制限を有効化する

このソリューションでデプロイされる Web ページへのアクセスを IP で制限したい場合、AWS WAF による IP 制限を有効化することができます。[cdk.json](./packages/cdk/cdk.json) の `allowedIpV4AddressRanges` では許可する IPv4 の CIDR を配列で指定することができ、`allowedIpV6AddressRanges` では許可する IPv6 の CIDR を配列で指定することができます。

```json
  "context": {
    "allowedIpV4AddressRanges": ["192.168.0.0/24"], // null から、許可 CIDR リストを指定することで有効化
    "allowedIpV6AddressRanges": ["2001:0db8::/32"], // null から、許可 CIDR リストを指定することで有効化
```

`allowedIpV4AddressRanges` あるいは `allowedIpV6AddressRanges` のどちらかを指定して再度
 `npm run cdk:deploy` を実行すると、WAF 用のスタックが us-east-1 にデプロイされます（AWS WAF V2 は CloudFront に使用する場合、us-east-1 のみしか現状対応していません）。us-east-1 で CDK を利用したことがない場合は、以下のコマンドを実行して、デプロイ前に Bootstrap を行ってください。

```bash
npx -w packages/cdk cdk bootstrap --region us-east-1
```
