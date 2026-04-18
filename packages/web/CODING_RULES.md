# コーディング規約 - フロントエンド

## React + TypeScript (packages/web)

### 1. ファイル構成

**概要**: 機能別にディレクトリを分け、コンポーネント、フック、ページを適切に分離する

```
packages/web/
├── public/               # 静的ファイル（CloudFrontから直接配信）
│   ├── locales/          # 国際化リソースファイル（JSON）
│   └── images/           # 画像・アイコンファイル
├── src/
│   ├── components/       # 再利用可能なUIコンポーネント
│   │                     # - 汎用コンポーネント: 直下に配置
│   │                     # - 機能固有コンポーネント: サブフォルダに配置
│   ├── hooks/            # カスタムフック（ビジネスロジック）
│   │                     # - 汎用フック: 直下に配置
│   │                     # - 機能固有フック: サブフォルダに配置
│   ├── pages/            # ページコンポーネント（ルーティング対象）
│   ├── utils/            # ユーティリティ関数・ヘルパー
│   ├── prompts/          # AI用プロンプトテンプレート
│   │   └── diagrams/     # 図表生成用プロンプト
│   ├── i18n/             # 国際化設定・ユーティリティ
│   │   └── utils/        # 国際化ヘルパー関数
│   ├── assets/           # 静的アセット（SVG、画像等）
│   └── @types/           # フロントエンド固有型定義
├── tests/                # テストファイル
└── 設定ファイル群         # vite.config.ts, tailwind.config.ts等
```

#### ディレクトリの役割

- **public/**: CloudFrontから直接配信される静的ファイル
- **components/**: 汎用コンポーネントは直下、機能固有コンポーネントはサブフォルダに配置
- **hooks/**: 汎用フックは直下、機能固有フックはサブフォルダに配置
- **pages/**: ルーティング対象のページコンポーネント
- **utils/**: 汎用的なユーティリティ関数
- **prompts/**: AI用プロンプトテンプレート、機能別分類
- **i18n/**: 国際化設定とヘルパー関数
- **assets/**: バンドルされる静的アセット（SVG等）
- **@types/**: フロントエンド固有の型定義ファイル

### 2. コンポーネント設計

**概要**: 関数コンポーネントを使用し、Props型を明確に定義する。適切な分割単位でコンポーネントを作成する

#### コンポーネント分割単位

```typescript
// ✅ 良い例 - 再利用可能なコンポーネント（components/直下）
const Button: React.FC<ButtonProps> = ({ children, onClick, disabled }) => {
  return (
    <button
      className="bg-aws-smile text-white px-4 py-2 rounded"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// ✅ 良い例 - 可読性向上のための分割（機能固有、サブフォルダ内）
// components/ChatPage/MessageInput.tsx
const MessageInput: React.FC<Props> = ({ onSend }) => {
  // チャット専用の入力コンポーネント
  // 他機能では再利用しないが、ChatPageの可読性向上のため分離
};

// ❌ 悪い例 - 無理な再利用を意識した過度な分割
const ButtonText: React.FC = ({ children }) => <span>{children}</span>;
const ButtonWrapper: React.FC = ({ children }) => <div>{children}</div>;
```

#### 分割ルール

- **再利用可能**: 複数箇所で使用するコンポーネントは`components/`直下に配置
- **可読性向上**: 単一機能でのみ使用するが、処理を切り出したいコンポーネントはサブフォルダに配置
- **過度な分割禁止**: 無理に再利用を意識した細かすぎる分割は避ける
- **配置ルール**: 再利用できないコンポーネントは機能別サブフォルダ内に格納

#### 命名規則

```typescript
// ✅ 良い例 - 大項目＋中項目＋小項目の階層命名（ソート考慮）
ButtonSend.tsx; // Button系の送信ボタン
ButtonCopy.tsx; // Button系のコピーボタン
ButtonToggle.tsx; // Button系のトグルボタン
InputText.tsx; // Input系のテキスト入力
InputChatContent.tsx; // Input系のチャット入力
ModalDialog.tsx; // Modal系のダイアログ
ModalSystemContext.tsx; // Modal系のシステムコンテキスト

// ❌ 悪い例 - 階層を意識しない命名
Send.tsx; // 何の送信か不明
CopyButton.tsx; // ソート時にButtonと離れる
TextInput.tsx; // ソート時にInputと離れる
```

#### 基本構造

```typescript
// ✅ 良い例 - 標準的なコンポーネント構造
import React from 'react';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  title?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const Button: React.FC<Props> = (props) => {
  return (
    <button
      className={props.className}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export default Button;

// ❌ 悪い例 - 型定義なし
const Button = (props: any) => {
  return <button>{props.children}</button>;
};
```

#### Props設計

- **BaseProps**: 共通プロパティ（className等）を継承
- **Optional vs Required**: 必須項目は`?`なしで定義
- **children**: React.ReactNodeを使用
- **イベントハンドラー**: 明確な関数型を定義

### 3. カスタムフック

**概要**: ビジネスロジックをカスタムフックに分離し、コンポーネントから状態管理を切り離す。APIアクセスは必ずAPIフックを経由する

#### APIアクセスの分離

- **APIフック**: `use{機能名}Api.ts`でサーバーとの通信を担当
- **ビジネスロジックフック**: APIフックを経由してビジネスロジックを実装
- **結合度の低減**: 直接fetch呼び出しを禁止し、APIフック経由でアクセス

#### フック分類

- **API呼び出し**: `use{機能名}Api.ts` - サーバーとの通信（必須経由ポイント）
- **状態管理**: `use{機能名}.ts` - アプリケーション状態・ビジネスロジック
- **ユーティリティ**: `use{機能名}.ts` - 汎用的なロジック

#### フックとユーティリティの使い分け

- **Hooks**: 状態管理を含む共通処理（useState、useEffect等を使用）
- **Utils**: 状態管理しない純粋な関数（`utils/`配下に配置）
- **判断基準**: React Hooksを使用する場合はカスタムフック、使用しない場合はユーティリティ関数

#### APIアクセスのルール

- **必須**: 全てのAPIアクセスはAPIフック（`use*Api.ts`）を経由
- **目的**: バックエンドAPIとフロントエンドの結合度を弱める
- **禁止**: ビジネスロジックフック内での直接fetch呼び出し

### 4. 状態管理

**概要**: 状態のスコープに応じて適切な管理方法を選択し、ライフサイクルを考慮した設計を行う

#### 状態管理のスコープ

- **コンポーネントレベル**: コンポーネント制御用の状態をuseStateで管理（コンポーネントのライフサイクルに依存）
- **Hooksレベル**: フック機能提供用の状態をuseStateで管理（フックのライフサイクルに依存）
- **アプリレベル**: アプリ全体で一貫した状態をZustandで管理（画面更新で初期化）
- **永続レベル**: ブラウザで永続保持する状態をLocalStorageで管理（UI設定等）

#### Zustand使用パターン

```typescript
// ✅ 良い例 - Zustandでグローバル状態管理
import { create } from 'zustand';
import { produce } from 'immer';

type ChatState = {
  messages: Message[];
  loading: boolean;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
};

const useChatState = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  addMessage: (message) =>
    set(
      produce((state) => {
        state.messages.push(message);
      })
    ),
  setLoading: (loading) => set({ loading }),
}));

// ✅ 良い例 - ローカル状態はuseState
const [inputValue, setInputValue] = useState('');
const [isOpen, setIsOpen] = useState(false);
```

#### 状態管理のルール

- **コンポーネント状態**: useStateでローカル管理
- **グローバル状態**: Zustand + Immerで不変性を保持
- **永続状態**: LocalStorageでUI設定を保存
- **サーバー状態**: SWRまたはTanStack Queryを使用
- **フォーム状態**: React Hook Formを推奨

### 5. 型定義

**概要**: バックエンドと共有する型定義は`packages/types/src`を使用し、APIスキーマは`protocol.d.ts`で管理する

#### 型定義の使用

- **共有型定義**: `packages/types/src/` - バックエンドとフロントエンド間で共有する全ての型
- **APIスキーマ**: `packages/types/src/protocol.d.ts` - API Request/Response型の専用ファイル
- **エンティティ型**: `packages/types/src/chat.d.ts`、`message.d.ts`等 - ドメインオブジェクトの型定義
- **フロントエンド固有型**: `@types/` - フロントエンドの処理でのみ使用し、フック・コンポーネント間で共有する型

#### フロントエンド固有型の用途

- **ナビゲーション**: ルーティングパラメータ、クエリパラメータの型定義
- **UI状態**: コンポーネント間で共有するUI状態の型定義
- **フォーム**: フォーム入力値、バリデーション結果の型定義
- **表示制御**: 表示モード、フィルタ条件等のフロントエンド専用ロジックの型定義
- **イベント**: カスタムイベント、コールバック関数の型定義

#### 型使用パターン

```typescript
// ✅ 良い例 - 共有型の使用
import { Chat, Message, SystemContext } from 'generative-ai-use-cases';
import {
  CreateChatResponse,
  UpdateFeedbackRequest,
} from 'generative-ai-use-cases';

// ✅ 良い例 - フロントエンド固有型
// @types/navigate.d.ts
export interface ChatPageQueryParams {
  chatId?: string;
  systemContextId?: string;
}

// ✅ 良い例 - コンポーネントProps型
type ButtonProps = BaseProps & {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
};
```

#### 型定義のルール

- **APIスキーマ**: `protocol.d.ts`でRequest/Response型を定義
- **共有型**: `generative-ai-use-cases`パッケージ経由でimport
- **独自型**: 必要最小限に留め、既存型との重複を避ける
- **禁止**: any型の使用、型なしでの実装

### 6. スタイリング

**概要**: TailwindCSSを使用し、テーマカラーを活用して一貫性のあるデザインを構築する

#### TailwindCSS使用ルール

```typescript
// ✅ 良い例 - テーマカラー使用
<button className="bg-aws-smile text-white px-4 py-2 rounded hover:bg-aws-smile/90">
  Click me
</button>

// ✅ 良い例 - テーマカラーでの条件付きスタイル
<button
  className={`px-4 py-2 rounded ${
    disabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-aws-smile text-white hover:bg-aws-smile/90'
  }`}
>
  Button
</button>

// ✅ 良い例 - その他のテーマカラー
<div className="text-aws-font-color border-aws-font-color/20">
  Content
</div>

// ❌ 悪い例 - 直接色指定
<button className="bg-blue-500 text-white">
  Button
</button>

// ❌ 悪い例 - インラインスタイル
<button style={{ backgroundColor: 'blue', color: 'white' }}>
  Button
</button>
```

#### スタイリングのルール

- **必須**: TailwindCSSクラスを使用
- **カラー**: テーマカラーを用途別に使い分け
  - `aws-smile`: アクション可能な要素（ボタン、リンク等）
  - `aws-sky`: 選択状態・強調表現
  - `aws-font-color`: 文字色
  - `aws-squid-ink`: メインテーマ・背景色
- **禁止**: インラインスタイル、直接的な色指定（blue-500等）
- **推奨**: 透明度調整（/90、/20等）でバリエーション作成

### 7. 国際化（i18n）

**概要**: react-i18nextを使用して多言語対応を実装する。英語・日本語は必須対応、他言語はオプショナル

#### 対応言語

- **必須**: 英語（en）、日本語（ja）
- **オプショナル**: その他の言語（韓国語等）
- **デフォルト**: 英語をフォールバック言語として設定

```typescript
// ✅ 良い例 - i18n使用
import { useTranslation } from 'react-i18next';

const Component = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('chat.title')}</h1>
      <p>{t('chat.description')}</p>
    </div>
  );
};

// ❌ 悪い例 - ハードコードされたテキスト
const Component = () => {
  return (
    <div>
      <h1>Chat</h1>
      <p>Start a conversation</p>
    </div>
  );
};
```

#### 国際化のルール

- **必須対応**: 全てのユーザー向けテキストを英語・日本語で提供
- **リソース配置**: `public/locales/{言語コード}/` 配下にJSONファイル
- **禁止**: UI上でのハードコードされたテキスト
- **推奨**: 開発者向けメッセージ（console.log等）は英語のみでも可

### 8. エラーハンドリング

**概要**: ErrorBoundaryとtry-catchを適切に使い分ける

```typescript
// ✅ 良い例 - API呼び出しのエラーハンドリング
const useChatApi = () => {
  const [error, setError] = useState<string | null>(null);

  const createChat = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/chat', { method: 'POST' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  return { createChat, error };
};

// ✅ 良い例 - ErrorBoundary使用
<ErrorBoundary>
  <ChatPage />
</ErrorBoundary>
```

### 9. パフォーマンス最適化

**概要**: React.memo、useCallback、useMemoを適切に使用する

```typescript
// ✅ 良い例 - React.memoでコンポーネント最適化
const ChatMessage = React.memo<Props>(({ message, onEdit }) => {
  return <div>{message.content}</div>;
});

// ✅ 良い例 - useCallbackでコールバック最適化
const handleSubmit = useCallback((message: string) => {
  sendMessage(message);
}, [sendMessage]);

// ✅ 良い例 - useMemoで計算結果キャッシュ
const filteredMessages = useMemo(() => {
  return messages.filter(msg => msg.role === 'user');
}, [messages]);
```
