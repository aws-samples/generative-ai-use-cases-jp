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
          text: 'GenU 執筆ユーズケース は、Notion-style WYSIWYG エディタです。AI による autocompletion を提供します。',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: 'https://github.com/steven-tey/novel',
                target: '_blank',
              },
            },
          ],
          text: 'Novel',
        },
        {
          type: 'text',
          text: ' で構築されています。',
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
              content: [{ type: 'text', text: 'Slash menu & bubble menu' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'AI autocomplete (type ' },
                { type: 'text', marks: [{ type: 'code' }], text: '++' },
                {
                  type: 'text',
                  text: ' to activate, or select from slash menu)',
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
                  text: 'Image uploads (drag & drop / copy & paste, or select from slash menu) ',
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
                  text: 'Add tweets from the command slash menu:',
                },
              ],
            },
            {
              type: 'twitter',
              attrs: {
                src: 'https://x.com/elonmusk/status/1800759252224729577',
              },
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
                  text: 'Mathematical symbols with LaTeX expression:',
                },
              ],
            },
            {
              type: 'orderedList',
              attrs: {
                tight: true,
                start: 1,
              },
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'math',
                          attrs: {
                            latex: 'E = mc^2',
                          },
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
                          type: 'math',
                          attrs: {
                            latex: 'a^2 = \\sqrt{b^2 + c^2}',
                          },
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
                          type: 'math',
                          attrs: {
                            latex:
                              '\\hat{f} (\\xi)=\\int_{-\\infty}^{\\infty}f(x)e^{-2\\pi ix\\xi}dx',
                          },
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
                          type: 'math',
                          attrs: {
                            latex:
                              'A=\\begin{bmatrix}a&b\\\\c&d \\end{bmatrix}',
                          },
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
                          type: 'math',
                          attrs: {
                            latex: '\\sum_{i=0}^n x_i',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
