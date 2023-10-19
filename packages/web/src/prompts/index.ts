import { GenerateMessageParams } from '../@types/cs-improvement';
import { GenerateMailAutoFillFormat, GenerateMailParams } from '../@types/mail';

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
出力は <output></output> の xml タグで囲んでください。
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

// メール生成
export const GenerateMailPrompt = {
  systemContext:
    'あなたはメール文章の作成を支援するAIアシスタントです。最初のチャットでメール文章生成の指示を出すので、その後のチャットで生成結果の改善を行なってください。',
  generationContext: (params: GenerateMailParams): string => {
    return `以下の条件をもとに、メール文章を作成してください。
なお、「シナリオ」を指定されている場合は、それを元にメール文章の作成を行なってください。

出力は、生成したメール文章だけにしてください。それ以外の文章は一切出力しないでください。例外はありません。

# メールを送る目的・状況
${params.situation}

# このメールで相手に伝えたいこと
${params.message}

# このメールで相手に行なって欲しいこと
${params.action ? params.action : '特になし'}

# 前提条件
${
  !params.recipientAttr
    ? ''
    : `## 送信先の情報
${params.recipientAttr}
`
}
${
  !params.recipient
    ? ''
    : `## 送信先
${params.recipient}
`
}
${
  !params.sender
    ? ''
    : `## 発信者
${params.sender}
`
}
${
  !params.context
    ? ''
    : `## メール生成の前提条件
${params.context}`
}
${
  !params.otherContext
    ? ''
    : `## その他の考慮して欲しいこと
${params.otherContext}`
}

## メール文章のカジュアル度
「5段階中${params.casual}」のカジュアル度でメールを書いてください。
5が友人に送るレベルのカジュアルさ、1がお客様に送るレベルのカジュアルさです。

`;
  },
  autoFillContext: `あなたは、メール文章を元にメタ情報を抽出するAIアシスタントです。
チャットでメール本文を送るので、あなたはメールの本文からメタ情報を抽出してください。`,
  autoFillFormat: (isReply: boolean) =>
    ({
      recipientAttr:
        'メール受信者の肩書きや所属会社などの属性を記載してください。',
      recipient:
        'メールの受信者を記載してください。なお、「様」や「さん」および、「課長」や「部長」などの肩書きなどは除いて出力してください。',
      senderAttr:
        'メール送信者の肩書きや所属会社などの属性を記載してください。',
      sender:
        'メールの送信者を記載してください。なお、「様」や「さん」および、「課長」や「部長」などの肩書きなどは除いて出力してください。',
      summary:
        'メール内容を要約してください。「〜について」という文章にしてください。',
      situation: 'メールの送信されたシチュエーションを詳しく記載してください。',
      message:
        '送信者が受信者にこのメールで伝えたことを詳細に記載してください。',
      action: isReply
        ? 'メールの受信者が行うべきことを一言で表してください。「〜をお願いします」という文章には絶対しないでください。'
        : '送信者が受信者に起こしてほしいアクションを記載してください。5W2Hの形式で記載してください',
      other: '上記以外で重要なことを記載してください。',
    }) as GenerateMailAutoFillFormat,

  fillNewMailParams: (
    metadata: GenerateMailAutoFillFormat
  ): GenerateMailParams => ({
    recipientAttr: metadata.recipientAttr,
    recipient: metadata.recipient,
    sender: metadata.sender,
    context: metadata.summary,
    situation: metadata.situation,
    casual: 3,
    message: metadata.message,
    action: metadata.action,
    otherContext: metadata.other,
  }),
  fillReplyMailParams: (
    metadata: GenerateMailAutoFillFormat
  ): GenerateMailParams => ({
    // メールの送信者と受信者を逆にして設定する
    recipient: metadata.sender,
    recipientAttr: metadata.senderAttr,
    sender: metadata.recipient,
    context: metadata.summary + 'の返信メール',
    // メールを送る状況に返信対象メールの詳細を設定
    situation: `## シナリオ
あなたは「## 発信者」という名前で「${metadata.action}」を行う役割です。「## 送信先」から送られてきた「## 要約されたメール」に返信する必要があります。
あなたは、「# このメールで相手に伝えたいこと」という意思があり、「# このメールで相手に行なって欲しいこと」というお願いをしたいです。
あなたは、これらの条件をもとに「## 送信先」への返信メールを書いてください。

## 要約されたメール
${metadata.situation}
${metadata.message}
`,
    casual: 3,
    message: '',
  }),
};

// メッセージ生成
export const GenerateMessagePrompt = {
  systemContext: `あなたは返信文章を生成するAIアシスタントです。
ユーザが非常に簡素な返信文章を入力するので、それをもとに返信用の文章を生成してください。`,
  generateMessage: (params: GenerateMessageParams): string => {
    return `以下の条件をもとに、返信用の文章を生成してください。
文章生成は、以下のステップで行なってください。

* まずは前提条件を理解してください。この前提条件は必ず守ってください。
* 「相手からのメッセージ」を理解してください。このメッセージに対する返信文章生成を行います。
* 「自分が伝えたいこと」をもとに返信文章の生成を行なってください。必ず「相手からのメッセージ」を考慮した文章とし、理由を含めた文章にしてください。

なお、出力は生成した文章だけにしてください。それ以外の文章は一切出力しないでください。例外はありません。

# 前提条件
## メッセージ生成の前提条件
${params.context}

## 現在の状況
${params.situation}

## 返信文章のカジュアル度
「5段階中${params.casual}」のカジュアル度でメッセージを書いてください。
5が友人に送るレベルのカジュアルさ、1がお客様に送るレベルのカジュアルさです。

${
  !params.otherContext
    ? ''
    : `## その他の考慮して欲しいこと
${params.otherContext}`
}

# 相手からのメッセージ
${params.recipientMessage}

# 自分が伝えたいこと
${params.senderMessage}`;
  },
};
