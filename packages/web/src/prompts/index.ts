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
    return `以下の <要約対象の文章></要約対象の文章> の xml タグで囲われた文章を要約してください。

<要約対象の文章>
${sentence}
</要約対象の文章>

${
  !context
    ? ''
    : `要約する際、以下の <要約時に考慮して欲しいこと></要約時に考慮して欲しいこと> の xml タグで囲われた内容を考慮してください。

<要約時に考慮して欲しいこと>
${context}
</要約時に考慮して欲しいこと>
`
}
出力は要約内容を <output></output> の xml タグで囲って出力してください。例外はありません。
`;
  },
};

export const EditorialPrompt = {
  systemContext:
    'あなたは丁寧に細かいところまで指摘する厳しい校閲担当者です。' +
    SYSTEM_CONTEXT_POSTFIX,
  editorialContext: (sentence: string, context?: string): string => {
    return `以下の <input></input> の xml タグで囲われた文章において誤字脱字は修正案を提示し、根拠やデータが不足している部分は具体的に指摘してください。
<input>
${sentence}
</input>
${
  context
    ? 'ただし、修正案や指摘は以下の <その他指摘してほしいこと></その他指摘してほしいこと>の xml タグで囲われたことを考慮してください。 <その他指摘してほしいこと>' +
      context +
      '</その他指摘してほしいこと>'
    : ''
}
出力は、必ずJSON形式で行ってください。それ以外の文言は一切出力してはいけません。例外はありません。xml のタグも出力してはいけません。
出力のJSONは、以下の<output-format></output-format> の xml タグで囲われた形式に沿った JSON Array形式としてください。項目の追加と削除は絶対にしないでください。
<output-format>
[{excerpt: string; replace?: string; comment?: string}]
</output-format>
指摘事項がない場合は空配列を出力してください。「指摘事項はありません」「誤字脱字はありません」などの出力は一切不要です。
`;
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
    return `<input></input>の xml タグで囲われた文章を ${language} に翻訳してください。
<input>
${sentence}
</input>
${
  !context
    ? ''
    : `ただし、翻訳時に<考慮して欲しいこと></考慮して欲しいこと> の xml タグで囲われた内容を考慮してください。<考慮して欲しいこと>${context}</考慮して欲しいこと>`
}

出力は翻訳結果だけを <output></output> の xml タグで囲って出力してください。
それ以外の文章は一切出力してはいけません。例外はありません。
`;
  },
};

// メール生成
export const GenerateMailPrompt = {
  systemContext:
    'あなたはメール文章の作成を支援する AI アシスタントです。最初のチャットでメール文章生成の指示を出すので、その後のチャットで生成結果の改善を行なってください。',
  generationContext: (params: GenerateMailParams): string => {
    return `以下の条件をもとに、メール文章を作成してください。

メールの状況や目的は、 以下の <メールを送る目的・状況></メールを送る目的・状況> の xml タグで囲われた内容のとおりです。
<メールを送る目的・状況>
${params.situation}
</メールを送る目的・状況>

このメールで相手に伝えたいことは、以下の <このメールで相手に伝えたいこと></このメールで相手に伝えたいこと> の xml タグで囲われた内容の通りです。
<このメールで相手に伝えたいこと>
${params.message}
</このメールで相手に伝えたいこと>

このメールで相手に行なって欲しいことは、以下の <このメールで相手に行なって欲しいこと></このメールで相手に行なって欲しいこと> の xml タグで囲われた内容の通りです。
<このメールで相手に行なって欲しいこと>
${params.action ? params.action : '特になし'}
</このメールで相手に行なって欲しいこと>

このメールの前提条件は、以下の <前提条件></前提条件> の xml タグで囲われた内容の通りです。
<前提条件>
${
  !params.recipientAttr
    ? ''
    : `送信先の情報は、以下の <送信先の情報></送信先の情報> の xml タグで囲われた内容の通りです。
<送信先の情報>${params.recipientAttr}</送信先の情報>
`
}
${
  !params.recipient
    ? ''
    : `送信先は、以下の <送信先></送信先> の xml タグで囲われた内容の通りです。
<送信先>${params.recipient}</送信先>
`
}
${
  !params.sender
    ? ''
    : `発信者は、以下の <発信者></<発信者> の xml タグで囲われた内容の通りです。
<発信者>${params.sender}</発信者>
`
}
${
  !params.context
    ? ''
    : `メール生成の前提条件は、以下の <メール生成の前提条件></メール生成の前提条件> の xml タグで囲われた内容の通りです。
<メール生成の前提条件>メール生成の前提条件${params.context}</メール生成の前提条件>
`
}
${
  !params.otherContext
    ? ''
    : `その他の考慮して欲しいことは、以下の <その他の考慮して欲しいこと></その他の考慮して欲しいこと> の xml タグで囲われた内容の通りです。
<その他の考慮して欲しいこと>${params.otherContext}</その他の考慮して欲しいこと>
`
}

メール文章のカジュアル度は、以下の <メールの文章のカジュアル度></メールの文章のカジュアル度> の xml タグで囲われた内容に合わせてください。
<メールの文章のカジュアル度>
「5段階中${params.casual}」のカジュアル度でメールを書いてください。
5が友人に送るレベルのカジュアルさ、1がお客様に送るレベルのカジュアルさです。
</メールの文章のカジュアル度>

</前提条件>

出力は、生成したメール文章だけを <output></output> の xml タグで囲って出力してください。
それ以外の文章は一切出力しないでください。例外はありません。

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
    situation: `メールのシナリオについては、<シナリオ></シナリオ> の xml タグに囲われた内容に合わせてください。
<シナリオ>
あなたは以下の <発信者></発信者> の xml タグに囲われた名前で「${metadata.action}」を行う役割です。以下の <送信先></送信先> の xml タグに囲われた相手から送られてきた、以下の <要約されたメール></<要約されたメール> の xml タグに囲われた内容に返信する必要があります。
<要約されたメール>${metadata.situation}</要約されたメール>
あなたは、以下の <このメールで相手に伝えたいこと></このメールで相手に伝えたいこと> の xml タグに囲われた内容を相手に伝える意思があり、以下の <このメールで相手に行なって欲しいこと></このメールで相手に行なって欲しいこと> の xml タグに囲われた内容を相手にお願いしたいです。
あなたは、これらの条件をもとに以下の <送信先></送信先> の xml タグに囲われた送信先への返信メールを書いてください。
</シナリオ>

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

1. まずは前提条件を理解してください。この前提条件は必ず守ってください。

返信の文面の前提条件は以下の <前提条件></前提条件> の xml タグで囲われた内容です。
<前提条件>
返信の文面を生成する際は、以下の <メッセージ生成の前提条件></メッセージ生成の前提条件> の xml タグで囲われた内容を考慮してください。
<メッセージ生成の前提条件>${params.context}</メッセージ生成の前提条件>

返信の文面を生成する際は、以下の <現在の状況></現在の状況> の xml タグで囲われた現在の状況を考慮してください。
${params.situation}

返信の文面のカジュアル度は、以下の <返信文章のカジュアル度></返信文章のカジュアル度> の xml タグで囲われたカジュアル度で生成してください。
<返信文章のカジュアル度>
「5段階中${params.casual}」のカジュアル度でメッセージを書いてください。
5が友人に送るレベルのカジュアルさ、1がお客様に送るレベルのカジュアルさです。
</返信文章のカジュアル度>

${
  !params.otherContext
    ? ''
    : `また、<その他の考慮して欲しいこと></その他の考慮して欲しいこと> の xml タグで囲われた、その他の考慮して欲しいことも考慮して返信の文面を生成してください。
<その他の考慮して欲しいこと>
${params.otherContext}
</その他の考慮して欲しいこと>
`
}

</前提条件>

2. 「相手からのメッセージ」を理解してください。このメッセージに対する返信文章生成を行います。「相手からのメッセージ」は <相手からのメッセージ></相手からのメッセージ> の xml タグに囲われた内容です。
<相手からのメッセージ>
${params.recipientMessage}
</相手からのメッセージ>

3. 「自分が伝えたいこと」をもとに返信文章の生成を行なってください。ただし、必ず「相手からのメッセージ」を考慮した文章とし、理由を含めた文章にしてください。「自分が伝えたいこと」は <自分が伝えたいこと></自分が伝えたいこと> の xml タグに囲われた内容です。
<自分が伝えたいこと>
${params.senderMessage}
</自分が伝えたいこと>

なお、出力は生成したメール文章だけを <output></output> の xml タグで囲って出力してください。
それ以外の文章は一切出力しないでください。例外はありません。`;
  },
};
