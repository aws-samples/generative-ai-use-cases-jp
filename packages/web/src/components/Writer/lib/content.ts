export const defaultEditorContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '【新機能】GenU 執筆ユースケース' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'GenU 執筆ユースケース は、AI と統合されたテキストエディタです。データはブラウザに一時保存されています。執筆した文章はそのまま Word 、Note、Google Docs などのテキストエディタにコピーできます。',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'チュートリアル' }],
    },
    {
      type: 'heading',
      attrs: { level: 4 },
      content: [{ type: 'text', text: '1. テキストエディタとして活用' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'テキストを入力できます。ヘッダーや箇条書きなどの構造は Slash (/) から追加、もしくはテキストを選択してバブルメニューから選択できます。以下のスペースで試してみましょう。',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [],
    },
    {
      type: 'heading',
      attrs: { level: 4 },
      content: [{ type: 'text', text: '2. AI オートコンプリート機能' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'AI オートコンプリート機能は、テキストを選択してバブルメニューから Ask AI を選択することで利用できます。',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '例 1) 以下の文を選択し短縮しましょう。（文章を選択 → Ask AI → 短くする → 選択範囲を置換）',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Amazon Bedrock は、単一の API を通じて AI21 Labs、Anthropic、Cohere、Luma、Meta、Mistral AI、poolside (近日リリース予定)、Stability AI、および Amazon などの大手 AI 企業からの高性能な基盤モデル (FM) の幅広い選択肢を提供するフルマネージドサービスであり、セキュリティ、プライバシー、責任ある AI を備えた生成 AI アプリケーションを構築するために必要な幅広い機能を提供します。Amazon Bedrock を使用すると、ユースケースに最適な FM を簡単に試して評価したり、微調整や検索拡張生成 (RAG) などの手法を使用してデータに合わせてカスタマイズしたり、エンタープライズシステムとデータソースを使用してタスクを実行するエージェントを構築したりできます。Amazon Bedrock はサーバーレスであるため、インフラストラクチャを管理する必要がありません。また、使い慣れた AWS サービスを使用して、生成 AI 機能をアプリケーションに安全に統合してデプロイできます。',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '例 2) 以下の文のファクトチェックを行いましょう。検索エージェントが利用できる環境でのみ利用可能です。（文章を選択 → Ask AI をクリック → ファクトチェック）',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Amazon Bedrock は、AWS の AI サービスです。',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 4 },
      content: [{ type: 'text', text: '3. 校閲機能' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '校閲機能は、右上のボタンから実行できます。以下はサンプルの間違ったテキストです。',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '依然までのツールよりもずっと便利。必ず協力な助けになります。文章のタイポや間違い見つけてくれます。',
        },
      ],
    },
  ],
};

export const emptyContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
};
