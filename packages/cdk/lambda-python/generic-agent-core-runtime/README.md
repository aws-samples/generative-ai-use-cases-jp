# Generic Agent Core Runtime

AWS Lambda 上で動作する Strands Agents SDK を使用したエージェントランタイムです。

## 概要

このパッケージは、Amazon Bedrock のモデルを使用して AI エージェントを実行し、ツール実行機能やストリーミングレスポンス機能を提供します。

## アーキテクチャ

- **Agent Manager**: Strands Agent の作成・実行を管理
- **Tool Manager**: MCP サーバーやコード実行ツールの管理
- **Config**: モデル情報やシステムプロンプトの設定管理

## ストリームイベント仕様

### Strands SDK の出力形式

Strands Agents SDK の `stream_async()` メソッドは、2 種類のデータ形式を出力します：

1. **`"event"` キー**: ストリーミングイベント（リアルタイムでフロントエンドに転送）
2. **`"message"` キー**: 完了メッセージ（toolResult を含む、変換処理が必要）

### フロントエンドに送信されるイベント

以下のイベントが JSON 形式でフロントエンドに送信されます：

| イベントタイプ            | 説明                     | 例                                                                                            |
| ------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| `messageStart`            | メッセージ開始           | `{"event": {"messageStart": {"role": "assistant"}}}`                                          |
| `contentBlockStart`       | コンテンツブロック開始   | `{"event": {"contentBlockStart": {"start": {"text": ""}, "contentBlockIndex": 0}}}`           |
| `contentBlockDelta`       | コンテンツブロックの差分 | `{"event": {"contentBlockDelta": {"delta": {"text": "こんにちは"}, "contentBlockIndex": 0}}}` |
| `contentBlockStop`        | コンテンツブロック終了   | `{"event": {"contentBlockStop": {"contentBlockIndex": 0}}}`                                   |
| `messageStop`             | メッセージ終了           | `{"event": {"messageStop": {"stopReason": "end_turn"}}}`                                      |
| `metadata`                | メタデータ（使用量など） | `{"event": {"metadata": {"usage": {"inputTokens": 100, "outputTokens": 50}}}}`                |
| `internalServerException` | エラー発生               | `{"event": {"internalServerException": {"message": "エラーメッセージ"}}}`                     |

### ツール実行の処理

#### toolUse（ツール呼び出し）

```json
{
  "event": {
    "contentBlockStart": {
      "start": {
        "toolUse": {
          "toolUseId": "tool_12345",
          "name": "get_weather",
          "input": { "city": "Tokyo" }
        }
      },
      "contentBlockIndex": 1
    }
  }
}
```

#### toolResult（ツール実行結果）

Strands SDK は `toolResult` を `"message"` イベント（role="user"）で出力するため、`agent.py` で以下のように変換処理を行います：

**SDK 出力（変換前）:**

```json
{
  "message": {
    "role": "user",
    "content": [
      {
        "toolResult": {
          "toolUseId": "tool_12345",
          "content": [{ "text": "東京の天気は晴れです" }]
        }
      }
    ]
  }
}
```

**フロントエンドへの送信（変換後）:**

```json
// contentBlockStart
{
  "event": {
    "contentBlockStart": {
      "start": {
        "toolResult": {
          "toolUseId": "tool_12345",
          "content": [{"text": "東京の天気は晴れです"}]
        }
      },
      "contentBlockIndex": 0
    }
  }
}

// contentBlockStop
{
  "event": {
    "contentBlockStop": {
      "contentBlockIndex": 0
    }
  }
}
```

### 変換処理の実装

`src/agent.py` の `process_request_streaming()` メソッドで、以下の処理を行います：

```python
async for event in agent.stream_async(processed_prompt):
    if "event" in event:
        # ストリーミングイベントはそのまま転送
        yield json.dumps(event, ensure_ascii=False) + "\n"
    elif "message" in event:
        # メッセージイベントの処理（toolResult を含む）
        message = event["message"]
        role = message.get("role")

        if role == "user":
            for content_block in message.get("content", []):
                if "toolResult" in content_block:
                    # toolResult を contentBlockStart/Stop 形式に変換
                    tool_result_event = {
                        "event": {
                            "contentBlockStart": {
                                "start": content_block,
                                "contentBlockIndex": 0
                            }
                        }
                    }
                    yield json.dumps(tool_result_event, ensure_ascii=False) + "\n"

                    tool_result_stop_event = {
                        "event": {
                            "contentBlockStop": {
                                "contentBlockIndex": 0
                            }
                        }
                    }
                    yield json.dumps(tool_result_stop_event, ensure_ascii=False) + "\n"
```

## 開発・テスト

### テスト実行

```bash
cd packages/cdk/lambda-python/generic-agent-core-runtime
python -m pytest tests/ -v -s
```

### ストリームイベントのテスト

`tests/test_stream_events.py` でストリームイベントの動作を確認できます：

```bash
python -m pytest tests/test_stream_events.py::test_stream_events -v -s
```

## 設定

### 環境変数

- `SYSTEM_PROMPT`: システムプロンプト
- `MAX_ITERATIONS`: 最大反復回数（デフォルト: 10）
- `PROMPT_CACHE_MODELS`: プロンプトキャッシュ対応モデル一覧
- `TOOLS_CACHE_MODELS`: ツールキャッシュ対応モデル一覧

### サポート機能

- Amazon Bedrock モデル（Claude、Nova、Titan など）
- MCP（Model Context Protocol）サーバー連携
- コード実行機能
- プロンプト・ツールキャッシュ最適化
- セッション管理・トレース機能

## ファイル構成

```
src/
├── agent.py          # AgentManager（メイン処理）
├── config.py         # 設定管理
├── tools.py          # ToolManager（ツール管理）
├── types.py          # 型定義
└── utils.py          # ユーティリティ関数

tests/
└── test_stream_events.py  # ストリームイベントのテスト
```
