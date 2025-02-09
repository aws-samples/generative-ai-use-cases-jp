export const defaultEditorContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '【新機能】GenU 執筆ユーズケース' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'GenU 執筆ユーズケース は、Notion スタイルの WYSIWYG エディタです。AI による autocompletion を提供します。',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: '機能' }],
    },
    {
      type: 'orderedList',
      attrs: { tight: true, start: 1 },
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Slash (/) メニュー & バブルメニュー' },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'AI オートコンプリート (Slash (/) メニューから選択)',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '校正 (右上ボタンから実行)',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
