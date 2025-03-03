import React, { useState } from 'react';
import { PiCaretUp } from 'react-icons/pi';
import ButtonCopy from '../ButtonCopy';

type PromptSampleProps = {
  title: string;
  prompt: string;
};
const PromptSample: React.FC<PromptSampleProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 rounded border border-gray-400">
      <div
        className="flex cursor-pointer items-center justify-between bg-gray-400 px-2 py-1 text-sm text-white hover:opacity-80"
        onClick={() => {
          setIsOpen(!isOpen);
        }}>
        例: {props.title}
        <PiCaretUp className={`${isOpen ? 'rotate-180' : ''} transition-all`} />
      </div>
      {isOpen && (
        <pre className="whitespace-pre-wrap break-words bg-gray-100 p-3 text-sm">
          {props.prompt}
          <div className="flex w-full justify-end">
            <ButtonCopy text={props.prompt} />
          </div>
        </pre>
      )}
    </div>
  );
};

const Placeholder: React.FC<{
  inputType: string;
  label?: string;
  options?: string;
}> = (props) => {
  return (
    <span className="rounded bg-gray-200 px-1 py-0.5">
      {`{{${props.inputType}${props.label !== undefined ? ':' + props.label : ''}${props.options !== undefined ? ':' + props.options : ''}}}`}
    </span>
  );
};

const UseCaseBuilderHelp = () => {
  return (
    <div className="flex flex-col gap-y-8 py-4">
      <div className="flex flex-col gap-y-4">
        <div className="text-lg font-bold">プロンプトテンプレートとは？</div>
        <div className="text-sm leading-relaxed">
          生成 AI
          に指示を出すための「ひな形」のようなものです。目的に応じて、あらかじめ指示文の型を用意しておくことができます。
          プロンプトテンプレートには実行時にテキストを埋め込むための placeholder
          が定義できます。
        </div>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="text-lg font-bold">Placeholder</div>
        <div className="text-sm leading-relaxed">
          Placeholder は <Placeholder inputType="入力タイプ" label="ラベル" />{' '}
          のように書きます。 ラベルが識別子になるため、同一のラベルを持つ
          placeholder は同じ入力であるとみなされます。 ラベルを省略して{' '}
          <Placeholder inputType="入力タイプ" />{' '}
          のように書くことも可能です。その場合、無ラベルの placeholder
          は同じ入力であるとみなされます。 実際に実行されたプロンプトは GenU
          の会話履歴から確認できます。
        </div>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="text-lg font-bold">Placeholder 一覧</div>

        <div className="flex flex-col gap-y-10">
          <div className="flex flex-col gap-y-4">
            <div className="flex items-center text-base font-bold">
              <Placeholder inputType="text" /> <ButtonCopy text={'{{text}}'} />
            </div>
            <div className="text-sm leading-relaxed">
              <Placeholder inputType="text" /> は最も基本的な placeholder です。
              <Placeholder inputType="text" /> あるいは{' '}
              <Placeholder inputType="text" label="ラベル" />{' '}
              のように記述します。
              <Placeholder inputType="text" />{' '}
              はテキスト入力を受け付けるフォームを作成し、入力した値をそのままプロンプトテンプレートに埋め込みます。
              <PromptSample
                title="メール返信の例"
                prompt={`あなたは、メール返信の担当者です。
以下のルールを守って、返信用のメールを作成してください。
<ルール>
- 取引先へのメールです。敬語を使う必要がありますが、関係構築ができているので、かしこまりすぎた文章である必要はありません。
- 返信対象メールの内容を理解し、返信内容に沿った返信用メールを作成してください。
- 返信対象メールと返信内容から読み取れないことは、絶対にメール文に含めないでください。
</ルール>
<返信対象メール>
{{text:返信対象のメール本文}}
</返信対象メール>
<返信内容>
{{text:返信内容}}
</返信内容>`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-4">
            <div className="flex items-center text-base font-bold">
              <Placeholder inputType="form" /> <ButtonCopy text={'{{form}}'} />
            </div>
            <div className="text-sm leading-relaxed">
              <Placeholder inputType="form" /> は入力フォームを定義するための
              placeholder です。
              <Placeholder inputType="form" /> あるいは{' '}
              <Placeholder inputType="form" label="ラベル" />{' '}
              のように記述します。
              <Placeholder inputType="form" />{' '}
              はテキスト入力を受け付けるフォームを作成しますが、
              <span className="font-bold">
                プロンプトテンプレートに入力を埋め込みません。
              </span>
              「RAG
              等でデータソースに問い合わせしたいが、問い合わせ内容そのものはプロンプトに埋め込みたくない」というユースケースで使います。
              <PromptSample
                title="クイズの生成"
                prompt={`あなたは、与えられた情報を元にクイズを生成する AI アシスタントです。

{{form:クイズの元になる情報を検索}}

以下の情報を読み込んで、4 択クイズを作成してください。
正解も合わせて教えてください。

<情報>
{{retrieveKendra:クイズの元になる情報を検索}}
</情報>`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-4">
            <div className="flex items-center text-base font-bold">
              <Placeholder inputType="select" />{' '}
              <ButtonCopy text={'{{select}}'} />
            </div>
            <div className="text-sm leading-relaxed">
              <Placeholder inputType="select" />{' '}
              はセレクトボックスを定義するための placeholder です。
              <Placeholder inputType="select" /> は
              <span className="font-bold">
                ラベルとオプションを省略できません。
              </span>
              必ず{' '}
              <Placeholder
                inputType="select"
                label="ラベル"
                options="選択肢1,選択肢2"
              />{' '}
              のように記述します。
              選択肢はカンマ区切りで定義します。ラベルを表示したくない場合は
              <Placeholder
                inputType="select"
                label=""
                options="選択肢1,選択肢2"
              />
              のように空文字ラベルを使います。(空文字ラベルは無ラベルとは異なります。)
              <PromptSample
                title="AWS サービスについての質問"
                prompt={`あなたは AWS サービスに詳しいスペシャリストです。

以下のサービスについての質問に答えてください。
{{select:AWS サービス:Amazon Bedrock,Amazon S3,AWS Lambda}}

質問は以下です。
{{text:質問}}
`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-4">
            <div className="flex items-center text-base font-bold">
              <Placeholder inputType="retrieveKendra" />{' '}
              <ButtonCopy text={'{{retrieveKendra}}'} />
            </div>
            <div className="text-sm leading-relaxed">
              <Placeholder inputType="retrieveKendra" /> は Amazon Kendra から
              retrieve した結果をプロンプトテンプレートに埋め込みます。
              <Placeholder inputType="retrieveKendra" /> あるいは{' '}
              <Placeholder inputType="retrieveKendra" label="ラベル" />{' '}
              のように記述します。
              <Placeholder inputType="retrieveKendra" /> は
              <span className="font-bold">
                検索クエリを入力するための placeholder (
                <Placeholder inputType="text" />) が別に必要
              </span>
              です。それらは同一ラベルである必要があります。
              実際に埋め込まれる値は Amazon Kendra の Retrieve API の{' '}
              <a
                className="text-aws-smile"
                href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_Retrieve.html#API_Retrieve_ResponseSyntax"
                target="_blank">
                ResultItems を JSON にした文字列
              </a>{' '}
              です。 この機能を利用するためには、GenU で RAG チャット (Amazon
              Kendra) が有効になっている必要があります。有効化の方法は{' '}
              <a
                className="text-aws-smile"
                href="https://github.com/aws-samples/generative-ai-use-cases-jp/blob/main/docs/DEPLOY_OPTION.md#rag-%E3%83%81%E3%83%A3%E3%83%83%E3%83%88-amazon-kendra-%E3%83%A6%E3%83%BC%E3%82%B9%E3%82%B1%E3%83%BC%E3%82%B9%E3%81%AE%E6%9C%89%E5%8A%B9%E5%8C%96"
                target="_blank">
                こちら
              </a>
              。
              <PromptSample
                title="シンプルな RAG"
                prompt={`あなたは、ユーザーの質問に答える AI アシスタントです。
以下の情報を読み込んでください。

<情報>
{{retrieveKendra:質問}}
</情報>

上の情報を参考に、以下の質問に答えてください。

<質問>
{{text:質問}}
</質問>`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-4">
            <div className="flex items-center text-base font-bold">
              <Placeholder inputType="retrieveKnowledgeBase" />{' '}
              <ButtonCopy text={'{{retrieveKnowledgeBase}}'} />
            </div>
            <div className="text-sm leading-relaxed">
              <Placeholder inputType="retrieveKnowledgeBase" /> は Knowledge
              Base から retrieve
              した結果をプロンプトテンプレートに埋め込みます。
              <Placeholder inputType="retrieveKnowledgeBase" /> あるいは{' '}
              <Placeholder inputType="retrieveKnowledgeBase" label="ラベル" />{' '}
              のように記述します。
              <Placeholder inputType="retrieveKnowledgeBase" /> は
              <span className="font-bold">
                検索クエリを入力するための placeholder (
                <Placeholder inputType="text" />) が別に必要
              </span>
              です。それらは同一ラベルである必要があります。
              実際に埋め込まれる値は Knowledge Base の Retrieve API の{' '}
              <a
                className="text-aws-smile"
                href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_ResponseSyntax"
                target="_blank">
                retrievalResults を JSON にした文字列
              </a>{' '}
              です。 この機能を利用するためには、GenU で RAG チャット (Knowledge
              Base) が有効になっている必要があります。有効化の方法は{' '}
              <a
                className="text-aws-smile"
                href="https://github.com/aws-samples/generative-ai-use-cases-jp/blob/main/docs/DEPLOY_OPTION.md#rag-%E3%83%81%E3%83%A3%E3%83%83%E3%83%88-knowledge-base-%E3%83%A6%E3%83%BC%E3%82%B9%E3%82%B1%E3%83%BC%E3%82%B9%E3%81%AE%E6%9C%89%E5%8A%B9%E5%8C%96"
                target="_blank">
                こちら
              </a>
              。
              <PromptSample
                title="シンプルな RAG"
                prompt={`あなたは、ユーザーの質問に答える AI アシスタントです。
以下の情報を読み込んでください。

<情報>
{{retrieveKnowledgeBase:質問}}
</情報>

上の情報を参考に、以下の質問に答えてください。

<質問>
{{text:質問}}
</質問>`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseBuilderHelp;
