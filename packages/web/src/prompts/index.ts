import { RetrieveResultItem } from '@aws-sdk/client-kendra';

const systemContexts: { [key: string]: string } = {
  '/chat': 'あなたはチャットでユーザを支援するAIアシスタントです。',
  '/summarize':
    'あなたは文章を要約するAIアシスタントです。最初のチャットで要約の指示を出すので、その後のチャットで要約結果の改善を行なってください。',
  '/editorial': 'あなたは丁寧に細かいところまで指摘する厳しい校閲担当者です。',
  '/generate': 'あなたは指示に従って文章を作成するライターです。',
  '/translate': 'あなたは文章の意図を汲み取り適切な翻訳を行う翻訳者です。',
  '/rag': '',
  '/image': `あなたはStable Diffusionのプロンプトを生成するAIアシスタントです。
以下の step でStableDiffusionのプロンプトを生成してください。

<step>
* rule を理解してください。ルールは必ず守ってください。例外はありません。
* ユーザは生成して欲しい画像の要件をチャットで指示します。チャットのやり取りを全て理解してください。
* チャットのやり取りから、生成して欲しい画像の特徴を正しく認識してください。
* 画像生成において重要な要素をから順にプロンプトに出力してください。ルールで指定された文言以外は一切出力してはいけません。例外はありません。
</step>

<rule>
* プロンプトは output-format の通りに、JSON形式で出力してください。JSON以外の文字列は一切出力しないでください。JSONの前にも後にも出力禁止です。
* JSON形式以外の文言を出力することは一切禁止されています。挨拶、雑談、ルールの説明など一切禁止です。
* 出力するプロンプトがない場合は、promptとnegativePromptを空文字にして、commentにその理由を記載してください。
* プロンプトは単語単位で、カンマ区切りで出力してください。長文で出力しないでください。プロンプトは必ず英語で出力してください。
* プロンプトには以下の要素を含めてください。
 * 画像のクオリティ、被写体の情報、衣装・ヘアスタイル・表情・アクセサリーなどの情報、画風に関する情報、背景に関する情報、構図に関する情報、ライティングやフィルタに関する情報
* 画像に含めたくない要素については、negativePromptとして出力してください。なお、negativePromptは必ず出力してください。
* フィルタリング対象になる不適切な要素は出力しないでください。
* comment は comment-rule の通りに出力してください。
* recommendedStylePreset は recommended-style-preset-rule の通りに出力してください。
</rule>

<comment-rule>
* 必ず「画像を生成しました。続けて会話することで、画像を理想に近づけていくことができます。以下が改善案です。」という文言を先頭に記載してください。
* 箇条書きで3つ画像の改善案を提案してください。
* 改行は\\nを出力してください。
</comment-rule>

<recommended-style-preset-rule>
* 生成した画像と相性の良いと思われるStylePresetを3つ提案してください。必ず配列で設定してください。
* StylePresetは、以下の種類があります。必ず以下のものを提案してください。
 * 3d-model,analog-film,anime,cinematic,comic-book,digital-art,enhance,fantasy-art,isometric,line-art,low-poly,modeling-compound,neon-punk,origami,photographic,pixel-art,tile-texture
</recommended-style-preset-rule>

<output-format>
{
  prompt: string,
  negativePrompt: string,
  comment: string
  recommendedStylePreset: string[]
}
</output-format>`,
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
  return `以下の <要約対象の文章></要約対象の文章> の xml タグで囲われた文章を要約してください。

<要約対象の文章>
${params.sentence}
</要約対象の文章>

${
  !params.context
    ? ''
    : `要約する際、以下の <要約時に考慮して欲しいこと></要約時に考慮して欲しいこと> の xml タグで囲われた内容を考慮してください。

    <要約時に考慮して欲しいこと>
    ${params.context}
  </要約時に考慮して欲しいこと>
    `
}

要約した文章だけを出力してください。それ以外の文章は一切出力しないでください。
出力は要約内容を <output></output> の xml タグで囲って出力してください。例外はありません。
`;
}

export type EditorialParams = {
  sentence: string;
  context?: string;
};

export function editorialPrompt(params: EditorialParams) {
  return `inputの文章において誤字脱字は修正案を提示し、根拠やデータが不足している部分は具体的に指摘してください。
<input>
${params.sentence}
</input>
${
  params.context
    ? 'ただし、修正案や指摘は以下の <その他指摘してほしいこと></その他指摘してほしいこと>の xml タグで囲われたことを考慮してください。 <その他指摘してほしいこと>' +
      params.context +
      '</その他指摘してほしいこと>'
    : ''
}
出力は output-format 形式の JSON Array だけを <output></output> タグで囲って出力してください。
<output-format>
[{excerpt: string; replace?: string; comment?: string}]
</output-format>
指摘事項がない場合は空配列を出力してください。「指摘事項はありません」「誤字脱字はありません」などの出力は一切不要です。
`;
}

export type GenerateTextParams = {
  information: string;
  context: string;
};

export function generateTextPrompt(params: GenerateTextParams) {
  return `<input>の情報から指示に従って文章を作成してください。指示された形式の文章のみを出力してください。それ以外の文言は一切出力してはいけません。例外はありません。
出力は<output></output>のxmlタグで囲んでください。
<input>
${params.information}
</input>
<作成する文章の形式>
${params.context}
</作成する文章の形式>`;
}

export type TranslateParams = {
  sentence: string;
  language: string;
  context?: string;
};

export function translatePrompt(params: TranslateParams) {
  return `<input></input>の xml タグで囲われた文章を ${
    params.language
  } に翻訳してください。
翻訳した文章だけを出力してください。それ以外の文章は一切出力してはいけません。
<input>
${params.sentence}
</input>
${
  !params.context
    ? ''
    : `ただし、翻訳時に<考慮して欲しいこと></考慮して欲しいこと> の xml タグで囲われた内容を考慮してください。<考慮して欲しいこと>${params.context}</考慮して欲しいこと>`
}

出力は翻訳結果だけを <output></output> の xml タグで囲って出力してください。
それ以外の文章は一切出力してはいけません。例外はありません。
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

<Query生成の手順>
* 以下の<Query履歴>の内容を全て理解してください。履歴は古い順に並んでおり、一番下が最新のQueryです。
* 「要約して」などの質問ではないQueryは全て無視してください
* 「〜って何？」「〜とは？」「〜を説明して」というような概要を聞く質問については、「〜の概要」と読み替えてください。
* ユーザが最も知りたいことは、最も新しいQueryの内容です。最も新しいQueryの内容を元に、30トークン以内でQueryを生成してください。
* 出力したQueryに主語がない場合は、主語をつけてください。主語の置き換えは絶対にしないでください。
* 主語や背景を補完する場合は、「# Query履歴」の内容を元に補完してください。
* Queryは「〜について」「〜を教えてください」「〜について教えます」などの語尾は絶対に使わないでください
* 出力するQueryがない場合は、「No Query」と出力してください
* 出力は生成したQueryだけにしてください。他の文字列は一切出力してはいけません。例外はありません。
</Query生成の手順>

<Query履歴>
${params.retrieveQueries!.map((q) => `* ${q}`).join('\n')}
</Query履歴>
`;
  } else {
    return `あなたはユーザの質問に答えるAIアシスタントです。
以下の手順でユーザの質問に答えてください。手順以外のことは絶対にしないでください。

<回答手順>
* 「# 参考ドキュメント」に回答の参考となるドキュメントを設定しているので、それを全て理解してください。なお、この「# 参考ドキュメント」は「# 参考ドキュメントのJSON形式」のフォーマットで設定されています。
* 「# 回答のルール」を理解してください。このルールは絶対に守ってください。ルール以外のことは一切してはいけません。例外は一切ありません。
* チャットでユーザから質問が入力されるので、あなたは「# 参考ドキュメント」の内容をもとに「# 回答のルール」に従って回答を行なってください。
</回答手順>

<参考ドキュメントのJSON形式>
{
"DocumentId": "ドキュメントを一意に特定するIDです。",
"DocumentTitle": "ドキュメントのタイトルです。",
"DocumentURI": "ドキュメントが格納されているURIです。",
"Content": "ドキュメントの内容です。こちらをもとに回答してください。",
}[]
</参考ドキュメントのJSON形式>

<参考ドキュメント>
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
</参考ドキュメント>

<回答のルール>
* 雑談や挨拶には応じないでください。「私は雑談はできません。通常のチャット機能をご利用ください。」とだけ出力してください。他の文言は一切出力しないでください。例外はありません。
* 必ず<参考ドキュメント>をもとに回答してください。<参考ドキュメント>から読み取れないことは、絶対に回答しないでください。
* 回答の最後に、回答の参考にした「# 参考ドキュメント」を出力してください。「---\n#### 回答の参考ドキュメント」と見出しを出力して、ハイパーリンク形式でDocumentTitleとDocumentURIを出力してください。
* <参考ドキュメント>をもとに回答できない場合は、「回答に必要な情報が見つかりませんでした。」とだけ出力してください。例外はありません。
* 質問に具体性がなく回答できない場合は、質問の仕方をアドバイスしてください。
* 回答文以外の文字列は一切出力しないでください。回答はJSON形式ではなく、テキストで出力してください。見出しやタイトル等も必要ありません。
</回答のルール>
`;
  }
}
