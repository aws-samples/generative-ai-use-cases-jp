# AI秘書機能仕様書

## 1. 概要

AI秘書機能は、ユーザーが入力した長文の状況から自動的にタスクを分解・管理し、チャットベースでタスクの進捗管理を行うシステムです。

## 2. 主要機能

### 2.1 タスク分解機能
- 長文入力からタスクを自動的に分解
- 大タスクと小タスクの階層構造を自動生成
- タスク間の関連性を分析・設定

### 2.2 タスク管理機能
- タスクの作成・編集・削除
- タスクの状態管理（未着手・進行中・完了）
- タスク一覧の表示・検索

### 2.3 チャットベース更新機能
- チャット形式での進捗報告
- 自然言語による状況変更の反映
- 関連タスクの自動更新

## 3. データモデル

### 3.1 タスク (Task)
```typescript
interface Task {
  taskId: string;      // タスクID
  parentTaskId?: string; // 親タスクID（小タスクの場合）
  title: string;       // タスクのタイトル
  description: string; // タスクの詳細説明
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; // タスクの状態
  createdAt: string;   // 作成日時
  updatedAt: string;   // 更新日時
}
```

### 3.2 タスクメッセージ (TaskMessage)
```typescript
interface TaskMessage {
  messageId: string;   // メッセージID
  taskId: string;      // 関連タスクID
  content: string;     // メッセージ内容
  type: 'PROGRESS' | 'UPDATE' | 'COMPLETION'; // メッセージタイプ
  createdAt: string;   // 作成日時
}
```

## 4. API仕様

### 4.1 タスク分析API
```
POST /api/tasks/analyze
リクエスト:
{
  "content": string  // 分析対象の長文
}

レスポンス:
{
  "tasks": Task[]    // 分解されたタスク一覧
}
```

### 4.2 タスク管理API
```
GET /api/tasks
タスク一覧の取得

POST /api/tasks
タスクの新規作成

GET /api/tasks/:taskId
タスク詳細の取得

PUT /api/tasks/:taskId
タスクの更新

DELETE /api/tasks/:taskId
タスクの削除
```

### 4.3 タスクメッセージAPI
```
POST /api/tasks/:taskId/messages
タスクへのメッセージ追加

GET /api/tasks/:taskId/messages
タスクのメッセージ履歴取得
```

## 5. システム構成

### 5.1 フロントエンド
- React + TypeScript
- 既存のチャットUIを拡張
- タスク管理用のコンポーネント追加

### 5.2 バックエンド
- AWS Lambda + API Gateway
- DynamoDB for タスクデータ保存
- Amazon Bedrock for タスク分析

### 5.3 AI機能
- タスク分解：長文を意味のある単位に分割
- 関連性分析：タスク間の依存関係を特定
- 進捗解析：チャットメッセージから進捗状況を判断

## 6. 実装フェーズ

### Phase 1: 基本機能実装
- タスクデータモデルの実装
- 基本的なCRUD API実装
- シンプルなタスク表示UI

### Phase 2: AI機能実装
- タスク分解ロジックの実装
- チャットベースの更新機能実装
- タスク間関連性の分析実装

### Phase 3: UI/UX改善
- タスク管理画面の改善
- チャットインターフェースの最適化
- レスポンス性能の改善

## 7. 制約事項・注意点

- 既存のチャット機能を最大限活用
- シンプルで直感的なUIを維持
- スケーラブルなデータ構造設計
- セキュリティ考慮（ユーザー認証連携）