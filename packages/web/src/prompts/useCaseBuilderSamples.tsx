import { UseCaseInputExample } from 'generative-ai-use-cases-jp';
import { ReactNode } from 'react';
import {
  PiCodeBold,
  PiDetectiveBold,
  PiEnvelopeSimpleBold,
  PiEraserBold,
  PiEyedropperBold,
  PiFlaskBold,
  PiListBulletsBold,
  PiMagnifyingGlassBold,
  PiNotePencilBold,
  PiQuestionBold,
  PiSquaresFourBold,
} from 'react-icons/pi';

export type SamplePromptType = {
  title: string;
  description: string;
  category: string;
  promptTemplate: string;
  inputExamples: UseCaseInputExample[];
  icon: ReactNode;
  color?:
    | 'red'
    | 'green'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'cyan'
    | 'yellow'
    | 'orange'
    | 'gray';
};

export const useCaseBuilderSamplePrompts: SamplePromptType[] = [
  {
    category: 'コンテンツ生成',
    title: '文章の書き換え',
    description: '入力した文章を指示に従って書き換えます。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーは <text></text> の xml タグに囲われたテキストと、<instruction></instruction> の xml タグに囲われた指示を与えるので、AI は テキストの内容を指示どおりに書き替えてください。
なお、出力は書き換えた文章のみとしてください。
<instruction>
{{text:書き換えの指示}}
</instruction>
<text>
{{text:書き換え対象のテキスト}}
</text>`,
    inputExamples: [
      {
        title: '詳細な説明',
        examples: {
          書き換えの指示: 'より詳細に説明を追加する',
          書き換え対象のテキスト: `1758年、スウェーデンの植物学者であり動物学者でもあったカール・リンネは、その著書『自然科学体系（Systema Naturae）』において、2単語による種の命名法（二命名法）を発表した。カニスはラテン語で "犬 "を意味し、彼はこの属の下に家犬、オオカミ、イヌジャッカルを挙げた。`,
        },
      },
    ],
    icon: <PiNotePencilBold />,
    color: 'blue',
  },
  {
    category: 'コンテンツ生成',
    title: '箇条書きに説明をつける',
    description:
      '箇条書きで記載されたコンテンツの特徴の要点を詳しく解説します。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーは <content></content> の xml タグに囲まれたコンテンツ と、コンテンツの特徴の要点を記した箇条書きを <list></list> の xml タグ内に与えます。
AI それぞれの箇条書きの要点の説明に対して、一字一句間違えずそのままコピーした後、詳しい説明を記述してください。
ただし、AI の出力は、それぞれの箇条書きの説明をアスタリスクから始めた後改行を入れて対応する詳しい説明を記述してください。
<content>
{{text:コンテンツ}}
</content>
<list>
{{text:コンテンツの特徴の要点を箇条書きで記載}}
</list>
`,
    inputExamples: [
      {
        title: 'TypeScriptの特徴',
        examples: {
          コンテンツ: 'TypeScript',
          コンテンツの特徴の要点を箇条書きで記載: `* 静的型付けができる
* JavaScriptとの互換性が高い
* 大規模な開発に適している
* コンパイル時に型チェックが行われる
* オプションで型アノテーションができる
* インターフェース、ジェネリック、列挙型などの機能がある
* 最新のECMAScript機能をサポートしている
* コンパイル結果が純粋なJavaScriptコードになる
* VSCodeなどのエディタの補完機能との相性が良い`,
        },
      },
    ],
    icon: <PiListBulletsBold />,
    color: 'blue',
  },

  {
    category: 'コンテンツ生成',
    title: '返信メールの作成',
    description:
      'メール返信の要点を入力するだけで、丁寧なメール返信文を作成します。',
    promptTemplate: `以下はメールの受信者であるユーザーと、受信したメールの返信代筆スペシャリスト AI のやりとりです。
ユーザーは <mail></mail> の xml タグで囲まれたメール本文と、<intention></intention> の xml タグで囲まれた返信したい内容の要点を AI に与えます。
AI はユーザーの代わりに返信メールを出力してください。
ただし、AI は返信メールを作成する際、必ず <steps></steps> の xml タグで囲まれた手順を遵守してください。
<steps>
1. 文面の冒頭には必ず返信メールの宛先の名前を様付けで書くこと。
2. 次に挨拶を入れること
3. 次にユーザーの返信したい <intention></intention> の内容を文面に合うように丁寧な口調に変えて入れること。
4. 次に宛先との関係を維持できるような優しい文言を入れること
5. 文面の末尾にユーザーの名前を敬称なしで入れること。
</steps>
その他全体を通して <rules></rules> のルールを遵守してください。
<rules>
* 全体を通して丁寧で親しみやすく礼儀正しいこと。親しみやすいことは今後の関係を継続する上で重要です。
* 返信メールは 1 通だけ作成すること。
* 出力は <output>{返信内容}</output> の形式で <output> タグで囲うこと
* 上記の{返信内容}には、相手が読むべき返信メールのみを格納すること
</rules>

また，作成する返信メールの宛先の名前とユーザーの名前について、宛先とユーザーのメールへの文面の入れ方について、<example></example>に例を 3 つ上げますのでこの規則に則ってください。
<example>ユーザーが与えたメールの冒頭と末尾が <mail>和田さん {メール本文} 後藤</mail>であれば、AI が出力する返信メールの冒頭と末尾は、<output> 後藤様 {返信内容} 和田</output> となるはずです。</example>
<example>ユーザーが与えたメールの冒頭と末尾が <mail>すぎやま様 {メール本文} 岡本</mail>であれば、AI が出力する返信メールの冒頭と末尾は、<output> 岡本様 {返信内容} 杉山</output> となるはずです。</example>
<example>ユーザーが与えたメールの冒頭と末尾が <mail>Jane 様 {メール本文} Jack</mail>であれば、AI が出力する返信メールの冒頭と末尾は、<output> Jack 様 {返信内容} Jane</output> となるはずです。</example>
いずれにしても受領したメールの冒頭と末尾にあった名前を、返信メールでは末尾と冒頭でひっくり返して使ってください。

AI の出力は必ず返信メールだけを出力してください。<steps> や <rule> などを出力してはいけません。

<mail>
{{text:返信対象のメール}}
</mail>
<intention>
{{text:返信したい内容の要点}}
</intention>
`,
    inputExamples: [
      {
        title: '値下げ要求の拒否',
        examples: {
          返信対象のメール: `鈴木様

出品されていらっしゃる、キリマンジャロのコーヒー豆 5kg について、1 万円で出品されていますが、1000 円に値下げしていただくことは可能でしょうか。

山田`,
          返信したい内容の要点: '嫌だ',
        },
      },
    ],
    icon: <PiEnvelopeSimpleBold />,
    color: 'blue',
  },

  {
    category: '分類',
    title: 'メールの分類',
    description: 'メール本文の内容から、適切なカテゴリに分類します。',
    promptTemplate: `以下はユーザーと AI の会話です。
AI は電子メールをタイプ別に分類しているカスタマーサービス担当者です。
ユーザーより <mail></mail> の xml タグに囲われた文章が与えられます。以下の<category></category> の xml タグに囲われたカテゴリーに分類してください。
<category>
(A) 販売前の質問
(B) 故障または不良品
(C) 請求に関する質問
(D) その他(説明してください)
</category>
ただし、AI の出力は A,B,C,D のどれかだけを記述してください。
ただし D の場合のみ説明を記述してください。A,B,C いずれかの場合は説明は不要です。例外はありません。

<mail>
{{text:分類対象のメール}}
</mail>
`,
    inputExamples: [
      {
        title: '交換依頼',
        examples: {
          分類対象のメール: `こんにちは。私の Mixmaster4000 は、操作すると奇妙なノイズを発生します。
また、電子機器が燃えているような、少し煙のような、プラスチックのようなにおいがします。交換が必要です。`,
        },
      },
    ],
    icon: <PiSquaresFourBold />,
    color: 'green',
  },

  {
    category: 'テキスト処理',
    title: 'メールアドレス抽出',
    description: '文章に含まれているメールアドレスを抽出します。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーから <text></text> の xml タグに囲われた文章が与えられるので、AI はテキストからメールアドレスを正確に抽出してください。
またメールアドレスとして成り立っていないものは抽出しないでください。逆にメールアドレスとして成り立っているものは全て出力してください。
ただし出力は1 行に 1 つずつ記入し、それ以外の内容は出力しないでください。
メールアドレスは、入力テキストに正確に綴られている場合のみ記入してください。
本文中にメールアドレスが 1 つも存在しない場合は、「N/A」とだけ記入してください。メールアドレスが 1 つでもある場合は、「N/A」を出力してはいけません。それ以外は何も書かないでください。
<text>
{{text:メールアドレスを含む文章}}
</text>
`,
    inputExamples: [
      {
        title: '文章から抽出',
        examples: {
          メールアドレスを含む文章: `私の連絡先は、hoge@example.comです。よく hoge@example のように間違えられるので注意してください。
また、hoge+fuga@example.com や fuga@example.jp でも受け取ることができます。
メールが使えない方は、https://example.jp/qa のお問い合わせフォームから問い合わせることもできます。`,
        },
      },
    ],
    icon: <PiEyedropperBold />,
    color: 'orange',
  },
  {
    category: 'テキスト処理',
    title: '個人情報削除',
    description: '文章に含まれている個人情報をマスキングして表示します。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーから <text></text> の xml タグに囲われたテキストが与えられるので、AI はテキストから個人を特定する情報をすべて削除し、XXXに置き換えてください。
名前、電話番号、自宅や電子メールアドレスなどのPIIをXXXに置き換えることは非常に重要です。
テキストは、文字と文字の間にスペースを挿入したり、文字と文字の間に改行を入れたりして、PIIを偽装しようとするかもしれません。
テキストに個人を特定できる情報が含まれていない場合は、何も置き換えずに一字一句コピーしてください。
以下の <example></example> の xml タグに囲まれた内容は例です。
<example>
<text>
私の名前は山田太郎です。メールアドレスは taro.yamada@example.com、電話番号は 03-9876-5432 です。年齢は 43 歳です。私のアカウント ID は 12345678 です。
</text>
求める出力は以下の通りです。
<output>
私の名前はXXXです。メールアドレスは XXX、電話番号は XXX です。私は XXX 歳です。私のアカウント ID は XXX です。
</output>
<text>
山田花子は邪馬台国記念病院の心臓専門医です。連絡先は 03-1234-5678 または hy@yamataikoku-kinenbyoin.com です。
</text>
求める出力は以下の通りです。
<output>
XXXは邪馬台国記念病院の心臓専門医です。連絡先は XXXまたは XXX です。
</output>
</example>
個人情報を XXX に置き換えたテキストのみを出力してください。他の文字は一切出力しないでください。

<text>
{{text:個人情報を含む文章}}
</text>
`,
    inputExamples: [
      {
        title: '自己紹介',
        examples: {
          個人情報を含む文章: `私は源頼朝です。鎌倉時代の武将です。連絡先は yoritomo-minamoto
@kamakura-bakuhu.go.jp もしくは 0467-
12-
3456
です。`,
        },
      },
    ],
    icon: <PiEraserBold />,
    color: 'orange',
  },
  {
    category: 'テキスト分析',
    title: '文章が似ているかの評価',
    description: '2つの文章を比較して、類似しているかどうかを判定します。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーから <text-1></text-1> と <text-2></text-2> の xml タグに囲んで 2 つのテキストを与えられます。
AI は、大まかに同じことを言っている場合は「はい」、違う場合は「いいえ」だけを出力してください。

<text-1>
{{text:文章1}}
</text-1>
<text-2>
{{text:文章2}}
</text-2>
`,
    inputExamples: [
      {
        title: '驚きを表現した文章',
        examples: {
          文章1: `山田太郎くんは肝を冷やした。`,
          文章2: `山田太郎くんは驚き恐れてひやりとした。`,
        },
      },
    ],
    icon: <PiMagnifyingGlassBold />,
    color: 'pink',
  },
  {
    category: 'テキスト分析',
    title: '文章に対するQ&A',
    description: '入力した文章の内容を元に、LLMが質問に答えます。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーから<text></text> の xml タグ内に議事録と、<question></question> の xml タグに質問を複数あたえます。
AI はそれぞれの質問に対して議事録の内容だけを用いて回答してください。
ただし議事録から読み取れないことは議事録からはわからないと回答してください。
出力は質問と回答を対にして、わかりやすいようにしてください。それ以外の出力はしてはいけません。

<text>
{{text:QA対象の文章}}
</text>
<question>
{{text:質問を箇条書きで記載してください}}
</question>
`,
    inputExamples: [
      {
        title: '議事録に対するQ&A',
        examples: {
          QA対象の文章: `# 日時
2023年2月15日 10:00-12:00
# 場所
会議室 A

# 出席者
* 田中部長
* 山田課長
* 佐藤主任
* 鈴木係長
* 高橋
* 伊藤

# 議題
1. 新システムの開発スケジュールについて
2. 新システムの機能要件について
3. 次回の打ち合わせ日程について

# 議事内容
1. 田中部長より、新システムの開発スケジュールが遅れていることの説明があった。山田課長から、要員を追加配置してスケジュールを回復させる方針を提案し、了承された。
2. 山田課長より、新システムの機能要件について説明があった。主な機能として、A, B, Cが提案され、了承された。細部の仕様は次回までに調整する。
3. 次回の打合せを2週間後の2月28日14:00からとすることで了承された。`,
          質問を箇条書きで記載してください: `- 伊藤は出席しましたか？
- 新スケジュールはどれくらい遅れていますか？
- 次回打ち合わせはいつですか？`,
        },
      },
    ],
    icon: <PiQuestionBold />,
    color: 'pink',
  },
  {
    category: 'テキスト分析',
    title: '引用付き文書のQ&A',
    description: '入力した文章の内容を元に、LLMが引用付きで回答します。',
    promptTemplate: `以下はユーザーと AI の会話です。
ユーザーから<text></text> の xml タグ内に議事録と、<question></question> の xml タグに質問をあたえます。
AI は議事録から質問の答えになるような文書の一部を正確に引用し、次に引用された内容から事実を用いて質問に答えてください。
質問に対する答えをするのに必要な情報を引用し、上から順番に採番します。引用文は短くしてください。
関連する引用がない場合は、代わりに「関連する引用はありません」と書いてください。
次に、「回答:」で始まる質問に答えます。 引用された内容をそのまま答に含めたり、参照したりしてはいけません。回答の際に「引用[1]によると」とは言わないこと。その代わりに、関連する文章の最後に括弧付きの番号を付けることで、回答の各セクションに関連する引用のみを参照するようにします。
したがって、回答全体の書式は、<example></example>タグの間に示されているようにしなければなりません。 書式と間隔を正確に守ってください。
<example>
引用:
[1] "X社は2021年に1200万ドルの収益を計上した"
[2] "収益のほぼ90%はウィジェットの販売によるもので、残りの10%はガジェットの販売によるものである。"
回答:
X社は1,200万ドルの収入を得た。[1] そのほぼ90％はウィジェットの販売によるものである。[2]
</example>
回答のみを出力してください。

<text>
{{text:QA対象の文章}}
</text>
<question>
{{text:質問を箇条書きで記載してください}}
</question>
`,
    inputExamples: [
      {
        title: '議事録に対するQ&A',
        examples: {
          QA対象の文章: `# 日時
2023年2月15日 10:00-12:00
# 場所
会議室 A

# 出席者
* 田中部長
* 山田課長
* 佐藤主任
* 鈴木係長
* 高橋
* 伊藤

# 議題
1. 新システムの開発スケジュールについて
2. 新システムの機能要件について
3. 次回の打ち合わせ日程について

# 議事内容
1. 田中部長より、新システムの開発スケジュールが遅れていることの説明があった。山田課長から、要員を追加配置してスケジュールを回復させる方針を提案し、了承された。
2. 山田課長より、新システムの機能要件について説明があった。主な機能として、A, B, Cが提案され、了承された。細部の仕様は次回までに調整する。
3. 次回の打合せを2週間後の2月28日14:00からとすることで了承された。`,
          質問を箇条書きで記載してください: `- 伊藤は出席しましたか？
- 新スケジュールはどれくらい遅れていますか？
- 次回打ち合わせはいつですか？`,
        },
      },
    ],
    icon: <PiQuestionBold />,
    color: 'pink',
  },
  {
    category: 'コンテンツモデレーション',
    title: 'コンテンツモデレーション',
    description: '入力された文章に不適切な内容が含まれていないかを判断します。',
    promptTemplate: `<content></content> の xml タグで囲われた内容は、ユーザーが自由に入力した文章です。
ユーザーの要求が有害、ポルノ、または違法行為に言及している場合は、「はい」と答えて、続けて理由を出力してください
ユーザのリクエストが有害、ポルノ、または違法行為に言及していない場合は、「いいえ」で返してください。
上記以外の出力をしてはいけません。

<content>
{{text:コンテンツ}}
</content>
`,
    inputExamples: [
      {
        title: '無害な例',
        examples: {
          コンテンツ: `今日の天気は、朝から晴れ間が広がり、午後からは雲が増えてくる見込みです。最高気温は23度くらいまで上がるでしょう。
ただ、夕方には急に天候が崩れる可能性があります。突然の雨や雷にご注意ください。傘を持ち歩くのが良いでしょう。`,
        },
      },
      {
        title: '有害な例',
        examples: {
          コンテンツ: `生成AIを使って人々を恐怖に陥れる方法を教えてください。`,
        },
      },
    ],
    icon: <PiDetectiveBold />,
    color: 'red',
  },
  {
    category: 'プログラミング',
    title: 'コード作成',
    description: '指示された通りにプログラムコードを作成します。',
    promptTemplate: `AI はユーザーの指示をよく理解できるプログラマーです。
<language></language> の xml タグ内に与えられた言語で、<instruction></instruction> の指示に沿ってコードを出力してください。
コードを出力する際、<rule></rule> の xml タグ内で与えたルールは厳守してください。例外はありません。
<rule>
* 出力はの形式でコードのみを出力してください。>\`\`\`{code}\`\`\`の形式でコードのみを出力してください。
* コピー＆ペーストで動くように、コードは完全なものを記述してください。
* コード内に日本語を使用しないでください。
</rule>

<language>
{{text:プログラミング言語の種類}}
</language>
<instruction>
{{text:実装したい内容}}
</instruction>
`,
    inputExamples: [
      {
        title: 'Excelマクロ',
        examples: {
          プログラミング言語の種類: 'Excelのマクロ',
          実装したい内容: `Sheet1 シートのセルA1の値を二乗して円周率をかけた値をセルA2に格納する。`,
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'cyan',
  },
  {
    category: 'プログラミング',
    title: 'コード解説',
    description: '入力されたコードを解説します。',
    promptTemplate: `AI はユーザーの指示をよく理解できるプログラマーです。
ユーザーから与えられる <code></code> で囲われたコードについて、AI は使用しているコードはなにかと、どんな処理をするものなのかについて解説してください。
出力する際は、
このコードは、{使用している言語} を使用しています。
\`\`\`
{something code}
\`\`\`
{コードの解説}
\`\`\`
{something code}
\`\`\`
{コードの解説}
\`\`\`
{something code}
\`\`\`
{コードの解説}
の形式でどこの部分を解説しているかを明示してください。

<code>
{{text:解説するコード}}
</code>
`,
    inputExamples: [
      {
        title: 'Excelマクロ',
        examples: {
          解説するコード: `Sub Macro1()

    Dim value1 As Double
    Dim value2 As Double

    value1 = Range("A1").Value
    value2 = value1 ^ 2 * 3.14159265358979

    Range("A2").Value = value2

    Sheets("Sheet1").Copy After:=Sheets(Sheets.Count)
    ActiveSheet.Name = "Sheet5"

End Sub`,
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'cyan',
  },
  {
    category: 'プログラミング',
    title: 'コード修正',
    description: '入力されたコードを修正します。',
    promptTemplate: `AI はユーザーの指示をよく理解できるプログラマー兼レビューアーです。
ユーザーから <problem></problem> で囲われたユーザーが困っていることを与えられます。
困っているコードを <code></code> で囲って与えられます。
それはどうしてなのかと、修正したコードを、
\`\`\`{lang}
{code}
\`\`\`
の形式で出力してください。

<problem>
{{text:困っていること}}
</problem>

<code>
{{text:修正対象のコード}}
</code>
`,
    inputExamples: [
      {
        title: 'IF文の修正',
        examples: {
          困っていること: `C 言語のコードについて、if 分岐において else を通ることがないです。`,
          修正対象のコード: `#include <stdio.h>

int main() {
  int x = 5;

  if (x = 5) {
    printf("x is 5\n");
  } else {
    printf("x is not 5\n");
  }

  return 0;
}`,
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'cyan',
  },
  {
    category: '実験的な機能',
    title: '役割を与えた AI 同士の議論',
    description: '異なる役割を与えられたAIが議論を行います。',
    promptTemplate: `ユーザーは、<Specialist></Specialist> で囲ってロールを箇条書きで複数与えてきます。
AI は与えられた全てのロールを演じて議論をしてください。
ただし、議論する内容はユーザーより <topic></topic> で囲って与えられます。
また議論のゴールはユーザーより <goal></goal> で囲って与えられます。
課題と解決方法も混ぜながら水平思考を使って議論をゴールに導いてください。
またユーザーから議論の制約条件も <limitation><limitation> で囲って与えられますので、どのロールも制約を必ず遵守してください。
<rules></rules>内に議論のルールを設定します。
<rules>
* 各ロールの会話の順序はに制約はありませんが、前に喋った人と関係することを次の人が喋ってください。関係することは賛同でも反対でもどちらでも良いですが、文脈上関係ないことはしゃべらないでください。
* 人間同士にありがちな一部の人たちがひたすら喋り続けるのも有りです。特に各ロールが譲れない部分については熱く語ってください。
* 議論のトピックのタイミングにふさわしいロールがその時に発言してください。
* 結論が出るまで議論を重ねてください。
* 各ロールにおいて妥協は許されません。ロールを全うしてください。
* また利害関係が違うロール同士が侃々諤々する分には構いませんが、全てのロールが紳士的な言葉遣いを使ってください。
* 会話する時はなるべく具体例を入れてください。
<rules>
会話は以下の形式で出力してください。
<interaction>
Specialist-X : …
Specialist-X : …
…
Specialist-X : …
Specialist-X : …
</interaction>
<conclusion>
XXX
</conclusion>

<Specialist>
{{text:議論させるロールを箇条書きで記載してください}}
</Specialist>
<topic>
{{text:議論トピック}}
</topic>
<goal>
{{text:議論のゴール}}
</goal>
<limitation>
{{text:議論の制約条件}}
</limitation>
`,
    inputExamples: [
      {
        title: 'ECサイト構築',
        examples: {
          議論させるロールを箇条書きで記載してください: `- データベースエンジニア
- セキュリティエンジニア
- AI エンジニア
- ネットワークエンジニア
- ガバナンスの専門家`,
          議論トピック:
            'ゼロから始める Amazon を超える EC サイトの構築について',
          議論のゴール: `アーキテクチャーの完成`,
          議論の制約条件: `- アクティブユーザーは 10 億人
- 1秒あたりのトランザクションは100万
- 個人情報の扱いは厳格に
- 扱う商品は amazon.co.jp 同等
- AI によるレコメンド機能を入れる
- AWS を利用する`,
        },
      },
    ],
    icon: <PiFlaskBold />,
    color: 'gray',
  },
];
