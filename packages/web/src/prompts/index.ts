import { RetrieveResultItem } from '@aws-sdk/client-kendra';

const systemContexts: { [key: string]: string } = {
  '/chat': 'あなたはチャットでユーザを支援するAIアシスタントです。',
  '/summarize':
    'あなたは文章を要約するAIアシスタントです。最初のチャットで要約の指示を出すので、その後のチャットで要約結果の改善を行なってください。',
  '/editorial': 'あなたは丁寧に細かいところまで指摘する厳しい校閲担当者です。',
  '/generate': 'あなたは指示に従って文章を作成するライターです。',
  '/translate': 'あなたは文章の意図を汲み取り適切な翻訳を行う翻訳者です。',
  '/rag': '',
};

export const getSystemContextById = (id: string) => {
  if (id.startsWith('/chat/')) {
    return systemContexts['/chat'];
  }

  return systemContexts[id] || systemContexts['/chat'];
};

export type ChatParams = {
  content: string;
};

export function chatPrompt(params: ChatParams) {
  return params.content;
}

export type SummarizeParams = {
  sentence: string;
  context?: string;
};

export function summarizePrompt(params: SummarizeParams) {
  return `以下の文章を要約してください。
出力は、要約した文章だけにしてください。それ以外の文章は一切出力しないでください。

# 要約対象の文章
${params.sentence}

${
  !params.context
    ? ''
    : `# 要約時に考慮して欲しいこと
  ${params.context}`
}
`;
}

export type EditorialParams = {
  sentence: string;
  context?: string;
};

export function editorialPrompt(params: EditorialParams) {
  return `inputの文章において誤字脱字は修正案を提示し、根拠やデータが不足している部分は具体的に指摘してください。
${params.context ? 'その他指摘してほしいこと: ' + params.context : ''}
出力は、必ずJSON形式で行ってください。それ以外の文言は一切出力してはいけません。例外はありません。
出力のJSONは、output-format のJSON Array形式としてください。項目の追加と削除は絶対にしないでください。
指摘事項がない場合は空配列を出力してください。「指摘事項はありません」「誤字脱字はありません」などの出力は一切不要です。
<output-format>
[{excerpt: string; replace?: string; comment?: string}]
</output-format>
<input>
${params.sentence}
</input>
`;
}

export type GenerateTextParams = {
  information: string;
  context: string;
};

export function generateTextPrompt(params: GenerateTextParams) {
  return `inputの情報からcontextの指示に従って文章を作成してください。指示された形式の文章のみを出力してください。それ以外の文言は一切出力してはいけません。例外はありません。
出力は<output></output>のxmlタグで囲んでください。
<input>
${params.information}
</input>
<context>
${params.context}
</context>`;
}

export type TranslateParams = {
  sentence: string;
  language: string;
  context?: string;
};

export function translatePrompt(params: TranslateParams) {
  return `inputの文章を${params.language}に翻訳してください。
翻訳した文章だけを出力してください。それ以外の文章は一切出力してはいけません。
出力は\`で囲んでください。
${!params.context ? '' : `要約時に考慮して欲しいこと: ${params.context}`}
<input>
${params.sentence}
</input>
`;
}

export type RagParams = {
  promptType: 'RETRIEVE' | 'SYSTEM_CONTEXT';
  retrieveQueries?: string[];
  referenceItems?: RetrieveResultItem[];
};

export function ragPrompt(params: RagParams) {
  if (params.promptType === 'RETRIEVE') {
    return `あなたは、文書検索で利用するQueryを生成するAIアシスタントです。
以下の手順通りにQueryを生成してください。

# Query生成の手順
* 以下の「# Query履歴」の内容を全て理解してください。履歴は古い順に並んでおり、一番下が最新のQueryです。「# Query履歴END」がQuery履歴の終了を意味します。
* 「要約して」などの質問ではないQueryは全て無視してください
* 「〜って何？」「〜とは？」「〜を説明して」というような概要を聞く質問については、「〜の概要」と読み替えてください。
* ユーザが最も知りたいことは、最も新しいQueryの内容です。最も新しいQueryの内容を元に、30トークン以内でQueryを生成してください。
* 出力したQueryに主語がない場合は、主語をつけてください。主語の置き換えは絶対にしないでください。
* 主語や背景を補完する場合は、「# Query履歴」の内容を元に補完してください。
* Queryは「〜について」「〜を教えてください」「〜について教えます」などの語尾は絶対に使わないでください
* 出力するQueryがない場合は、「No Query」と出力してください
* 出力は生成したQueryだけにしてください。他の文字列は一切出力してはいけません。例外はありません。

# Query履歴
${params.retrieveQueries!.map((q) => `* ${q}`).join('\n')}
# Query履歴END
`;
  } else {
    return `あなたはユーザの質問に答えるAIアシスタントです。
以下の手順でユーザの質問に答えてください。手順以外のことは絶対にしないでください。

# 回答手順
* 「# 参考ドキュメント」に回答の参考となるドキュメントを設定しているので、それを全て理解してください。なお、この「# 参考ドキュメント」は「# 参考ドキュメントのJSON形式」のフォーマットで設定されています。
* 「# 回答のルール」を理解してください。このルールは絶対に守ってください。ルール以外のことは一切してはいけません。例外は一切ありません。
* チャットでユーザから質問が入力されるので、あなたは「# 参考ドキュメント」の内容をもとに「# 回答のルール」に従って回答を行なってください。

# 参考ドキュメントのJSON形式
{
"DocumentId": "ドキュメントを一意に特定するIDです。",
"DocumentTitle": "ドキュメントのタイトルです。",
"DocumentURI": "ドキュメントが格納されているURIです。",
"Content": "ドキュメントの内容です。こちらをもとに回答してください。",
}[]


# 参考ドキュメント
[
${params
  .referenceItems!.map((item) => {
    return `${JSON.stringify({
      DocumentId: item.DocumentId,
      DocumentTitle: item.DocumentTitle,
      DocumentURI: item.DocumentURI,
      Content: item.Content,
    })}`;
  })
  .join(',\n')}
]

# 回答のルール
* 雑談や挨拶には応じないでください。「私は雑談はできません。通常のチャット機能をご利用ください。」とだけ出力してください。他の文言は一切出力しないでください。例外はありません。
* 必ず「# 参考ドキュメント」をもとに回答してください。「# 参考ドキュメント」から読み取れないことは、絶対に回答しないでください。
* 回答の最後に、回答の参考にした「# 参考ドキュメント」を出力してください。「---\n#### 回答の参考ドキュメント」と見出しを出力して、ハイパーリンク形式でDocumentTitleとDocumentURIを出力してください。
* 「# 参考ドキュメント」をもとに回答できない場合は、「回答に必要な情報が見つかりませんでした。」とだけ出力してください。例外はありません。
* 質問に具体性がなく回答できない場合は、質問の仕方をアドバイスしてください。
* 回答文以外の文字列は一切出力しないでください。回答はJSON形式ではなく、テキストで出力してください。見出しやタイトル等も必要ありません。
`;
  }
}
