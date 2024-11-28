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
        <pre className="relative m-2 mt-1 whitespace-pre-wrap break-words rounded bg-gray-100 p-1 text-sm">
          {props.prompt}
          <ButtonCopy
            text={props.prompt}
            className="absolute bottom-2 right-2"
          />
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
          <div className="text-lg font-bold">
            プロンプトテンプレートについて
          </div>
          <div className="mt-1 text-sm">
            ユースケースごとに、プロンプトテンプレートを定義することができます。ユースケースを実行すると、ここで定義したプロンプトテンプレートをもとに、生成
            AI が推論を行います。
          </div>
        </div>
        <div>
          <div className="text-lg font-bold">可変項目の設定</div>
          <div className="mt-1 text-sm">
            プロンプトテンプレートの中には、可変項目を設定することができます。この可変項目を設定すると、自動的に画面上に入力欄が配置されます。ユースケースを実行すると、プロンプトテンプレート内の可変項目が対応する画面の入力値で置換されます。
          </div>
        </div>
        <div>
          <div className="text-base font-bold">可変項目の設定方法</div>
          <div className="mt-1 text-sm">
            プロンプトテンプレート内に、
            <span className="rounded bg-gray-200 px-2 py-0.5 font-light">
              {'{{text:見出し}}'}
            </span>
            の形式で入力してください。「見出し」は画面上に表示される入力項目のラベルとなります。
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default UseCaseBuilderHelp;
