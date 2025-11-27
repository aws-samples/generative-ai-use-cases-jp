# メンテナンスモード クイックリファレンス

## よく使うコマンド

```bash
# メンテナンスモードを有効化
./scripts/maintenance.sh tmp on

# メンテナンスモードを無効化
./scripts/maintenance.sh tmp off

# ステータス確認
./scripts/maintenance.sh tmp status
```

## IPホワイトリストコマンド

```bash
# IPを追加（カンマ区切り）
./scripts/maintenance-mode.sh tmp whitelist-add 203.0.113.1,198.51.100.50

# ホワイトリストに登録されたIPを表示
./scripts/maintenance-mode.sh tmp whitelist-show

# IPを削除
./scripts/maintenance-mode.sh tmp whitelist-rm 203.0.113.1

# すべてクリア
./scripts/maintenance-mode.sh tmp whitelist-clear
```

## 環境

- `tmp` - 一時/テスト環境
- `devel` - 開発環境
- `produ` - 本番環境
- `hosoy` - Hosoy環境

## 重要な注意事項

⚠️ **メンテナンスモード切替後**:

1. キャッシュ無効化の伝播に30〜60秒待つ
2. ユーザーはブラウザで**強制リロード**が必要:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - またはシークレット/プライベートモードを使用

⚠️ **キャッシュ無効化**は自動ですが、グローバル伝播に時間がかかります

⚠️ **ブラウザの302リダイレクトキャッシュ**は積極的 - ユーザーは強制リロード必須

## トラブルシューティング ワンライナー

```bash
# KVSを直接確認
aws --profile <profile> cloudfront-keyvaluestore list-keys \
  --kvs-arn <kvs-arn>

# 最近の無効化を確認
aws --profile <profile> cloudfront list-invalidations \
  --distribution-id <distribution-id> --max-items 5

# curlでテスト（ブラウザキャッシュを回避）
curl -I "https://<cloudfront-domain>/test-$(date +%s).html"
```

## よくある問題

| 問題                                 | 解決策                                 |
| ------------------------------------ | -------------------------------------- |
| `off`にしてもメンテナンス表示        | ブラウザで強制リロード（Ctrl+Shift+R） |
| メンテナンスが有効化されない         | 60秒待つ、ステータス確認、KVS確認      |
| スクリプトがスタックを見つけられない | 環境名とAWSプロファイルを確認          |
| IPホワイトリストが機能しない         | IPの完全一致を確認（CIDRレンジ非対応） |

## 手動KVS更新（緊急時のみ）

```bash
# 現在のETagを取得
ETAG=$(aws --profile <profile> cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn <kvs-arn> \
  --query 'ETag' --output text)

# メンテナンスモードを設定
aws --profile <profile> cloudfront-keyvaluestore put-key \
  --kvs-arn <kvs-arn> \
  --key maintenance --value "false" --if-match "$ETAG"

# 手動更新後は必ずキャッシュ無効化
aws --profile <profile> cloudfront create-invalidation \
  --distribution-id <distribution-id> --paths "/*"
```

**⚠️ 手動コマンドではなく、常にスクリプトを使用してキャッシュ無効化を確実に実行してください！**
