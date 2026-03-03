# リサーチエージェントユースケースのデプロイガイド

## リサーチエージェントとは

リサーチエージェントは、AWS Bedrock AgentCore Runtime を使用した高度なリサーチ機能です。Web 検索や AWS ドキュメント検索を活用し、技術調査、ビジネス分析、課題解決のための情報収集を自動化します。

### 主な機能

- **Web 検索**: Brave Search API を使用したリアルタイム Web 検索
- **AWS ドキュメント検索**: AWS 公式ドキュメントからの情報取得
- **3つのリサーチモード**:
  - Technical Research（技術調査）- 詳細な技術分析
  - General Research（一般調査）- ビジネス分析
  - Mini Research（簡易調査）- 迅速な情報取得

## Brave Search API キーの取得

リサーチエージェントを使用するには、Brave Search API キーが必須です。AWS Marketplace 経由で取得することで、AWS の請求書に含めることができ、社内の請求処理が簡素化されます。

### AWS Marketplace での API キー取得手順

#### 1. AWS Marketplace を開く

[AWS Marketplace](https://aws.amazon.com/marketplace) にアクセスします。

![Marketplace の画面](../assets/images/research-agent/image-20260117212443510.png)

#### 2. Brave を検索

検索ボックスに「Brave」と入力して検索します。

![Brave で検索](../assets/images/research-agent/image-20260117212621182.png)

#### 3. View purchase options を選択

Brave Search API の製品ページで「View purchase options」ボタンをクリックします。

![View purchase options を押す](../assets/images/research-agent/image-20260117212701103.png)

#### 4. Subscribe を実行

「Subscribe」ボタンをクリックしてサブスクリプションを開始します。

![Subscribe を押す](../assets/images/research-agent/image-20260117212811040.png)

#### 5. Manage Subscriptions から Launch

「Manage Subscriptions」ページに移動し、Brave の行にある「Launch」ボタンをクリックします。

![Manage Subscriptions から Launch を押す](../assets/images/research-agent/image-20260117213324968.png)

#### 6. Setup Account

「Setup Account」ボタンをクリックします。

![Setup Account を押す](../assets/images/research-agent/image-20260117213409229.png)

#### 7. API キーの取得

Brave の API キーが表示されます。このキーをコピーして安全に保管してください。

![Brave の API Key が表示される](../assets/images/research-agent/image-20260117213449939.png)

> [!IMPORTANT]
> API キーは一度しか表示されない場合があります。必ず安全な場所に保存してください。

## デプロイ設定

取得した API キーを GenU の設定ファイルに追加します。

### parameter.ts を使用する場合

`packages/cdk/parameter.ts` を編集：

```typescript
// parameter.ts
const envs: Record<string, Partial<StackInput>> = {
  dev: {
    researchAgentEnabled: true,
    researchAgentBraveApiKey: 'YOUR_BRAVE_API_KEY', // 取得した API キー
    researchAgentTavilyApiKey: '', // オプション
  },
};
```

**設定パラメータの説明**:

- `researchAgentEnabled`: リサーチエージェント機能を有効化（Web UI表示 + Bedrock AgentCore Runtime作成）

### cdk.json を使用する場合

`packages/cdk/cdk.json` を編集：

```json
{
  "context": {
    "researchAgentEnabled": true,
    "researchAgentBraveApiKey": "YOUR_BRAVE_API_KEY",
    "researchAgentTavilyApiKey": ""
  }
}
```

### デプロイの実行

設定ファイルを編集後、以下のコマンドでデプロイします：

```bash
npm run cdk:deploy
```

デプロイには約 20 分かかります。デプロイ完了後、GenU のトップページに「リサーチ」ユースケースが表示されます。

詳細な設定オプションについては、[デプロイオプション](./DEPLOY_OPTION.md#リサーチエージェントユースケースの有効化) を参照してください。

## Brave の料金

- **1000 回の Web 検索あたり 9 USD**
- **1 秒あたり 50 回の検索リクエストの上限**
- **月間の制限なし**

詳細は [Marketplace の Brave のページ](https://aws.amazon.com/marketplace/pp/prodview-qjlabherxghtq) で確認できます。

![Brave の料金](../assets/images/research-agent/image-20260118013444855.png)

## 参考リンク

詳細な手順や動作確認方法については、以下のブログ記事を参照してください：

- [AWS で Web 検索！Marketplace から Brave API を使う](https://zenn.dev/aws_japan/articles/aws-marketplace-brave-api)
