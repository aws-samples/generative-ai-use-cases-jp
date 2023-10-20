const SYSTEM_CONTEXT_POSTFIX = '';

export const CasualOptionList = [
  {
    label: '1',
    value: 1,
  },
  {
    label: '2',
    value: 2,
  },
  {
    label: '3',
    value: 3,
  },
  {
    label: '4',
    value: 4,
  },
  {
    label: '5',
    value: 5,
  },
];

// チャット
export const ChatPrompt = {
  systemContext:
    'あなたはチャットでユーザを支援するAIアシスタントです。' +
    SYSTEM_CONTEXT_POSTFIX,
};

// 文章要約
export const SummarizePrompt = {
  systemContext:
    'あなたは文章を要約するAIアシスタントです。最初のチャットで要約の指示を出すので、その後のチャットで要約結果の改善を行なってください。' +
    SYSTEM_CONTEXT_POSTFIX,
  summaryContext: (sentence: string, context?: string): string => {
    return `以下の文章を要約してください。
出力は、要約した文章だけにしてください。それ以外の文章は一切出力しないでください。

# 要約対象の文章
${sentence}

${
  !context
    ? ''
    : `# 要約時に考慮して欲しいこと
${context}`
}
`;
  },
};

// 文章校正
export const EditorialPrompt = {
  systemContext:
    'あなたは丁寧に細かいところまで指摘する厳しい校閲担当者です。' +
    SYSTEM_CONTEXT_POSTFIX,
  editorialContext: (sentence: string, context?: string): string => {
    return `inputの文章において誤字脱字は修正案を提示し、根拠やデータが不足している部分は具体的に指摘してください。
${context ? 'その他指摘してほしいこと: ' + context : ''}
出力は、必ずJSON形式で行ってください。それ以外の文言は一切出力してはいけません。例外はありません。
出力のJSONは、output-format のJSON Array形式としてください。項目の追加と削除は絶対にしないでください。
指摘事項がない場合は空配列を出力してください。「指摘事項はありません」「誤字脱字はありません」などの出力は一切不要です。
<output-format>
[{excerpt: string; replace?: string; comment?: string}]
</output-format>
<input>
${sentence}
</input>
`;
  },
};

// 文章生成
export const GenerateTextPrompt = {
  systemContext:
    'あなたは指示に従って文章を作成するライターです。' + SYSTEM_CONTEXT_POSTFIX,
  generateTextContext: (information: string, context: string): string => {
    return `inputの情報からcontextの指示に従って文章を作成してください。指示された形式の文章のみを出力してください。それ以外の文言は一切出力してはいけません。例外はありません。
出力は<output></output>のxmlタグで囲んでください。
<input>
${information}
</input>
<context>
${context}
</context>`;
  },
};

// 翻訳
export const TranslatePrompt = {
  systemContext:
    'あなたは文章の意図を汲み取り適切な翻訳を行う翻訳者です。' +
    SYSTEM_CONTEXT_POSTFIX,
  translateContext: (
    sentence: string,
    language: string,
    context?: string
  ): string => {
    return `inputの文章を${language}に翻訳してください。
翻訳した文章だけを出力してください。それ以外の文章は一切出力してはいけません。
出力は\`で囲んでください。
${!context ? '' : `要約時に考慮して欲しいこと: ${context}`}
<input>
${sentence}
</input>
`;
  },
};
