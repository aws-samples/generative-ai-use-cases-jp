import React, { useState } from 'react';
import ButtonIcon from '../ButtonIcon';
import { PiCaretRight, PiCaretUp } from 'react-icons/pi';
import ButtonCopy from '../ButtonCopy';

type PromptSampleProps = {
  title: string;
  prompt: string;
};
const PromptSample: React.FC<PromptSampleProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded border">
      <div
        className="flex cursor-pointer items-center justify-between p-2 px-3 font-bold hover:bg-gray-200"
        onClick={() => {
          setIsOpen(!isOpen);
        }}>
        {props.title}
        <PiCaretUp className={`${isOpen ? 'rotate-180' : ''} transition-all`} />
      </div>
      {isOpen && (
        <pre className="m-2 mt-1 whitespace-pre-wrap break-words rounded bg-gray-100 p-1 text-sm">
          {props.prompt}
          <div className="flex w-full justify-end">
            <ButtonCopy text={props.prompt} className="" />
          </div>
        </pre>
      )}
    </div>
  );
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const UseCaseBuilderHelp: React.FC<Props> = (props) => {
  return (
    <div
      className={`${props.isOpen ? 'right-0' : '-right-96'} fixed top-0 z-[9999999] h-screen w-96 overflow-y-auto border-l bg-white px-6 py-3 shadow transition-all`}>
      <div className="mb-6 flex justify-between p-1 text-xl font-bold">
        <div>ヘルプ</div>
        <ButtonIcon onClick={props.onClose}>
          <PiCaretRight />
        </ButtonIcon>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="text-lg font-bold">プロンプトテンプレートとは?</div>
          <div className="mt-1 text-sm">
            生成AIに指示を出すための「ひな形」のようなものです。目的に応じて、あらかじめ指示文の型を用意しておくことができます。
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">可変項目</div>
          <div className="mt-1 text-sm">
            プロンプトテンプレートの中に「後から内容を入れられる場所」（可変項目）を作れます。例えるなら、穴埋め問題の空欄のようなものです。
            可変項目を定義すると、自動的に入力用の欄が画面に表示されます。
            また、入力された内容が実行時にテンプレート内の該当箇所に自動で入ります。
          </div>
        </div>
        <div>
          <div className="text-base font-bold">可変項目の設定方法</div>
          <div className="mt-1 text-sm">
            プロンプトテンプレート内に以下の形式で記述します。
            <br />
            <span className="rounded bg-gray-200 px-1 py-0.5 font-light">
              {'{{入力タイプ:見出し}}'}
            </span>
            <br />
            ※「見出し」は入力欄のラベルとなります（省略可）
          </div>
        </div>
        <div>
          <div className="text-base font-bold">可変項目一覧</div>
          <div className="mt-3 text-sm">
            <div className="mb-1 w-fit rounded bg-gray-200 px-1 py-0.5 font-light">
              {'{{text:見出し}}'}
            </div>
            自由入力を受け付けます。入力された内容をそのまま可変項目が定義された場所に埋め込みます。
          </div>
          <div className="mt-3 text-sm">
            <div className="mb-1 w-fit rounded bg-gray-200 px-1 py-0.5 font-light">
              {'{{retrieveKendra:見出し}}'}
            </div>
            Amazon Kendra から Retrieve
            した結果を可変項目が定義された場所に埋め込みます。Retrieve
            した結果は Amazon Kendra の Retrieve API の
            <a
              href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_Retrieve.html#kendra-Retrieve-response-ResultItems"
              className="text-aws-smile"
              target="_blank">
              ResultItems を JSON にした文字列
            </a>
            です。
            <span className="font-bold">
              この機能を利用するためには、GenU で RAG チャット (Amazon Kendra)
              が有効になっている必要があります。
            </span>
          </div>
          <div className="mt-3 text-sm">
            <div className="mb-1 w-fit rounded bg-gray-200 px-1 py-0.5 font-light">
              {'{{retrieveKnowledgeBase:見出し}}'}
            </div>
            Knowledge Base から Retrieve
            した結果を可変項目が定義された場所に埋め込みます。Retrieve
            した結果は Knowledge Base の Retrieve API の
            <a
              href="https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_ResponseSyntax"
              className="text-aws-smile"
              target="_blank">
              retrievalResults を JSON にした文字列
            </a>
            です。
            <span className="font-bold">
              この機能を利用するためには、GenU で RAG チャット (Knowledge Base)
              が有効になっている必要があります。
            </span>
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">
            プロンプトテンプレートサンプル
          </div>
          <div className="mt-1 flex flex-col gap-2">
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
            <PromptSample
              title="CDK のコード出力"
              prompt={`あなたはAWSの専門家で優秀な開発者でもあります。
利用者から構築したいシステムの構成が示されます。
あなたは、その内容をもとにAWS CDKのコードを生成してください。
ただし、コード生成ルールは必ず守ってください。例外はありません。

<コード生成ルール>
- 利用者から指定されなかった場合、AWS CDKのTypeScriptでコードを作成してください。
- 適度にコメントを入れて、わかりやすくしてください。
- セキュリティ的に安全なコードを生成してください。
</コード生成ルール>

<構築したいシステムの構成>
{{text:CDK で生成したい構成の概要}}
</構築したいシステムの構成>`}
            />
            <PromptSample
              title="Knowledge Base を利用した基本的な RAG"
              prompt={`あなたはユーザーの質問に答える AI アシスタントです。
ユーザーの質問と取得した情報を与えるので、情報を元に質問に答えてください。
必ず与えられた情報のみを参照してください。既成事実や憶測で答えてはいけません。

<質問>
{{text:質問}}
</質問>

<情報>
{{retrieveKnowledgeBase:検索クエリ}}
</情報>`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseBuilderHelp;
