# メンテナンスモードスクリプト

CloudFrontメンテナンスモードを自動キャッシュ無効化付きで管理するための包括的なスクリプトです。

## クイックスタート

```bash
# 現在のステータスを確認
./scripts/maintenance-mode.sh <env> status

# メンテナンスモードを有効化
./scripts/maintenance-mode.sh <env> on

# メンテナンスモードを無効化
./scripts/maintenance-mode.sh <env> off
```

## スクリプト概要

### `maintenance-mode.sh` - メイン管理スクリプト

自動CloudFrontキャッシュ無効化付きの、すべてのメンテナンスモード操作のための統合スクリプトです。

#### 機能

- ✅ メンテナンスモードの有効化/無効化
- ✅ 自動CloudFrontキャッシュ無効化
- ✅ IPホワイトリスト管理
- ✅ ステータス確認
- ✅ マルチ環境対応
- ✅ カラーコード付き出力

## 使用方法

### 基本コマンド

```bash
./maintenance-mode.sh <env> <command> [options]
```

**コマンド**:

- `on` - メンテナンスモードを有効化
- `off` - メンテナンスモードを無効化
- `status` - 現在のステータスを確認
- `whitelist-add` - IPをホワイトリストに追加
- `whitelist-rm` - IPをホワイトリストから削除
- `whitelist-show` - ホワイトリストに登録されたIPを表示
- `whitelist-clear` - すべてのIPをクリア

**オプション**:

- `--profile <name>` - AWSプロファイル（デフォルト: genu）
- `--no-invalidate` - キャッシュ無効化をスキップ
- `--help` - ヘルプを表示

### 使用例

#### メンテナンスモードの有効化/無効化

```bash
# tmp環境でメンテナンスモードを有効化
./maintenance-mode.sh <env> on

# メンテナンスモードを無効化
./maintenance-mode.sh <env> off

# 別のAWSプロファイルを使用
./maintenance-mode.sh <env> on --profile production

# キャッシュ無効化なしで有効化（非推奨）
./maintenance-mode.sh <env> on --no-invalidate
```

#### ステータス確認

```bash
# 現在のメンテナンスモードステータスを確認
./maintenance-mode.sh <env> status
```

出力例:

```
=== メンテナンスモードステータス ===
✓ メンテナンスモード: 無効

=== IPホワイトリスト ===
  - 203.0.113.1
  - 198.51.100.50

=== CloudFront ディストリビューション ===
  Distribution ID: <distribution-id>
  URL: https://<cloudfront-domain>
```

#### IPホワイトリスト管理

```bash
# 単一のIPを追加
./maintenance-mode.sh tmp whitelist-add 203.0.113.1

# 複数のIPを追加（カンマ区切り）
./maintenance-mode.sh tmp whitelist-add 203.0.113.1,198.51.100.50

# 現在のホワイトリストを表示
./maintenance-mode.sh tmp whitelist-show

# IPを削除
./maintenance-mode.sh tmp whitelist-rm 203.0.113.1

# すべてのIPをクリア
./maintenance-mode.sh tmp whitelist-clear
```

## 動作の仕組み

### メンテナンスモードフロー

1. **KVSを更新** - CloudFront KeyValueStoreの`maintenance`キーを`"true"`または`"false"`に設定
2. **キャッシュ無効化** - すべてのパス(`/*`)のCloudFrontキャッシュ無効化を作成
3. **伝播待ち** - 変更がグローバルに伝播するまで30〜60秒
4. **ユーザー操作** - ユーザーは強制リロード（Ctrl+Shift+RまたはCmd+Shift+R）が必要な場合あり

### CloudFront Function ロジック

viewer-request CloudFront Functionは以下をチェック:

1. **メンテナンスキー** - `maintenance = "true"`の場合、ホワイトリストチェックに進む
2. **IPホワイトリスト** - クライアントIPがホワイトリストにあれば通過許可
3. **リダイレクト** - それ以外の場合、HTTP 302で`/maintenance.html`にリダイレクト

### キャッシュ無効化

キャッシュ無効化は**重要**です。理由:

- CloudFrontはエッジロケーションで応答をグローバルにキャッシュ
- 無効化がないと、ユーザーは古いキャッシュされたリダイレクトを見る
- ブラウザキャッシュも表示に影響

スクリプトは変更後に自動的にキャッシュを無効化します。

## アーキテクチャ

### コンポーネント

```
┌─────────────────────────────────────────────────┐
│ CloudFront Distribution                         │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │ Viewer Request Function                │   │
│  │ - メンテナンスモードをKVSで確認       │   │
│  │ - IPホワイトリストをKVSで確認         │   │
│  │ - メンテナンスONならリダイレクト      │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │ KeyValueStore (KVS)                    │   │
│  │ - maintenance: "true" or "false"       │   │
│  │ - ipWhitelist: "ip1,ip2,..."           │   │
│  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### KVSキー

| キー          | 型     | 説明                                     | 例                            |
| ------------- | ------ | ---------------------------------------- | ----------------------------- |
| `maintenance` | string | メンテナンスモードの有効化/無効化        | `"true"` または `"false"`     |
| `ipWhitelist` | string | バイパスを許可するIPのカンマ区切りリスト | `"203.0.113.1,198.51.100.50"` |

## トラブルシューティング

### メンテナンスモードが有効化されない

**問題**: `"true"`に設定したのにサイトにアクセスできる

**解決策**:

1. **KVS値を確認**: `./maintenance-mode.sh <env> status`
2. **伝播を待つ**: 無効化後30〜60秒
3. **ブラウザキャッシュをクリア**: 強制リロード（Ctrl+Shift+R）
4. **キャッシュ無効化を確認**: AWSコンソール → CloudFront → Invalidations

### メンテナンスモードが無効化されない

**問題**: `"false"`に設定したのにメンテナンスページが表示される

**解決策**:

1. **無効化を実行**: スクリプトが自動実行
2. **伝播を待つ**: 30〜60秒
3. **ブラウザキャッシュをクリア**: 強制リロード（Ctrl+Shift+R）またはシークレットモード
4. **ブラウザのリダイレクトキャッシュを確認**: ブラウザは302リダイレクトを積極的にキャッシュ

### スクリプトエラー

**問題**: "Could not find Web stack"

**解決策**: 環境名とAWSプロファイルを確認

```bash
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

**問題**: "Failed to update KVS"

**解決策**: ETag不一致 - コマンドを再試行（スクリプトが現在のETagを自動取得）

## ベストプラクティス

### 1. 常にスクリプトを使用

キャッシュ無効化なしでKVSを手動更新しない:

```bash
# ❌ 悪い例 - 無効化なしの手動更新
aws cloudfront-keyvaluestore put-key ...

# ✅ 良い例 - スクリプトを使用
./maintenance-mode.sh <env> on
```

### 2. 本番前にテスト

```bash
# まずdev環境でテスト
./maintenance-mode.sh dev on
# メンテナンスページが動作することを確認
./maintenance-mode.sh dev off

# その後本番環境に適用
./maintenance-mode.sh prod on
```

### 3. 管理者IPをホワイトリスト登録

```bash
# 管理/運用チームのIPを追加
./maintenance-mode.sh <env> whitelist-add 203.0.113.1,198.51.100.50
```

### 4. ユーザーとコミュニケーション

メンテナンスモード有効化時:

1. ユーザーに事前通知
2. メンテナンスモードを有効化
3. CloudWatchでエラーを監視
4. サービス復旧時に通知

### 5. キャッシュ無効化を監視

```bash
# 無効化ステータスを確認
aws cloudfront get-invalidation \
  --distribution-id <id> \
  --id <invalidation-id>
```

## 高度な使用方法

### 環境ごとに異なるAWSプロファイル

```bash
# 開発環境
./maintenance-mode.sh dev on --profile dev-aws-profile

# 本番環境
./maintenance-mode.sh prod on --profile prod-aws-profile
```

### 定期メンテナンス

```bash
#!/bin/bash
# scheduled-maintenance.sh

# 午前2時に有効化
echo "メンテナンスモードを有効化中..."
./maintenance-mode.sh prod on

# 更新/デプロイメントを実行
echo "メンテナンスタスクを実行中..."
# ... デプロイコマンド ...

# 午前6時に無効化
echo "メンテナンスモードを無効化中..."
./maintenance-mode.sh prod off
```

## セキュリティに関する考慮事項

### IPホワイトリスト

- ✅ メンテナンス中の管理/運用チームアクセスに使用
- ✅ 監視サービスのIPを追加して誤警報を防止
- ❌ 主要なセキュリティ機能として依存しない
- ❌ 広範なIP範囲をホワイトリスト登録しない

### KVSアクセス

- KeyValueStoreはCloudFront Functionから読み取り専用
- 書き込みアクセスには適切なIAM権限を持つAWS認証情報が必要
- スクリプトはAWSプロファイル認証情報を使用

### キャッシュ無効化コスト

- 月あたり最初の1,000無効化パスは無料
- 追加パスはパスあたり$0.005
- `/*`の使用は1パスとカウント

## リファレンス

### 有用なAWS CLIコマンド

```bash
# すべてのディストリビューションを一覧表示
aws cloudfront list-distributions

# ディストリビューション設定を取得
aws cloudfront get-distribution --id <id>

# KVSキーを一覧表示
aws cloudfront-keyvaluestore list-keys \
  --kvs-arn <arn>

# 特定のキーを取得
aws cloudfront-keyvaluestore get-key \
  --kvs-arn <arn> \
  --key maintenance

# 無効化ステータスを確認
aws cloudfront list-invalidations --distribution-id <id>
```

## サポート

問題や質問がある場合:

1. 上記のトラブルシューティングセクションを確認
2. CloudFront Functionログを確認（利用可能な場合）
3. CloudFormationスタック出力を確認
4. AWS認証情報と権限を確認
