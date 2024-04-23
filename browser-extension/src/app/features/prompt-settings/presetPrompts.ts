import { PromptSetting } from '../../../@types/settings';

/**
 * 各項目の説明
 *  systemContextId: 一意に識別するID
 *  systemContextTitle: 見出しとして表示されます
 *  systemContext: プロンプトを記載してください。
 *                 <output></output>の形式で出力するように指示をすると、出力が安定します（outputタグは自動除去されます）。
 *  ignoreHistory: 会話履歴が送信されません。対話形式である必要がないタスクは、trueに設定することをおすすめします。
 *  directSend: 拡張機能を開いた瞬間に送信されます。入力値を個別に修正する必要がない場合は、trueに設定することをおすすめします。
 *  initializeMessages: 過去の送信内容をクリアしてから表示します。画面に常に最新のメッセージしか表示したくない場合は、trueを設定してください。
 *  useForm: フォーム形式で入力したい場合に、trueを設定してください。
 *  formDefinitions: フォームの定義をします。以下の項目を配列形式で入力してください。
 *    label: 項目のラベルを入力します。
 *    tag: プロンプトに埋め込むXMLタグを入力します。フォームの入力値が、このXMLタグで囲われて送信されます。
 *    autoCopy: Web画面で選択した値を自動入力する場合は、trueを設定してください。
 */

export const presetPrompts: PromptSetting[] = [
  {
    systemContextId: 'chat',
    systemContextTitle: 'チャット',
    systemContext: `以下はユーザーと優秀なAIアシスタントのやりとりです。
ユーザーは AI に指示を与えるので、AI は与えられた指示を親切かつ的確にこなしてください。`,
    ignoreHistory: false,
  },
  {
    systemContextId: 'summary',
    systemContextTitle: '要約',
    systemContext: `以下はユーザーと文章要約のスペシャリスト AI のやりとりです。
ユーザーは文章を与えるので、AI は与えられた文章をわかりやすく日本語で要約してください。
要約結果は以下の形式で出力してください。
<output>{要約結果}</output>`,
    ignoreHistory: true,
    directSend: true,
    initializeMessages: true,
  },
  {
    systemContextId: 'translate-japanese',
    systemContextTitle: '和訳',
    systemContext: `以下は日本語に翻訳したいユーザーと翻訳スペシャリスト AI との会話です。
ユーザーは AI にテキストを与えます。AI は与えられたテキストを日本語に翻訳してください。
出力は以下の形式を守ってください。
<output>{翻訳結果}</output>`,
    ignoreHistory: true,
    directSend: true,
    initializeMessages: true,
  },
  {
    systemContextId: 'translate-english',
    systemContextTitle: '英訳',
    systemContext: `This is a conversation between a user who wants to translate text into English and a specialist AI translator.
The user will provide the text, and the AI will translate the given text into English.
Follow the format below for the output.
<output>{translated result}</output>`,
    ignoreHistory: true,
    directSend: true,
    initializeMessages: true,
  },
  {
    systemContextId: 'question',
    systemContextTitle: '質問',
    systemContext: `以下はユーザーと AI のやりとりです。
ユーザーは AI にユーザーがわからないことを与えるので、AI は与えられたことを優しく教えて下さい。
意味が複数ある場合は複数の意味を列挙してください。
ただし、無理して回答する必要はなく未知の単語や支離滅裂な質問はわからないと回答してください。
AI の出力は以下の形式で出力してください。
<output>{回答}</output>`,
    ignoreHistory: true,
    directSend: true,
  },
  {
    systemContextId: 'reply',
    systemContextTitle: '返信',
    systemContext: `以下はメールの受信者であるユーザーと、受信したメールの返信代筆スペシャリスト AI のやりとりです。
ユーザーは <message></message> の xml タグで囲まれたメール本文と、<reply></reply> の xml タグで囲まれた返信したい内容の要点を AI に与えます。
AI はユーザーの代わりに返信メールを出力してください。
ただし、AI は返信メールを作成する際、必ず <steps></steps> の xml タグで囲まれた手順を遵守してください。
<steps>
1. 冒頭に挨拶を入れること
2. 次にユーザーの返信したい <reply></reply> の内容を文面に合うように丁寧な口調に変えて入れること。
3. 次に宛先との関係を維持できるような優しい文言を入れること
</steps>
その他全体を通して <rules></rules> のルールを遵守してください。
<rules>
* 全体を通して丁寧で親しみやすく礼儀正しいこと。親しみやすいことは今後の関係を継続する上で重要です。
* 返信メールは 1 通だけ作成すること。
* 返信内容には、相手が読むべき返信メールのみを格納すること
</rules>
返信内容は以下の形式で出力してください。
<output>{返信内容}</output>
`,
    useForm: true,
    formDefinitions: [
      {
        label: '受領メッセージ',
        tag: 'message',
        autoCopy: true,
      },
      {
        label: '返信内容',
        tag: 'reply',
        autoCopy: false,
      },
    ],
    initializeMessages: true,
  },
];
