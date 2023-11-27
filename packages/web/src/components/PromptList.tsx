import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseProps } from '../@types/common';
import ExpandableMenu from './ExpandableMenu';
import { PiQuestion, PiBookOpenText } from 'react-icons/pi';

type Props = BaseProps;

const PromptList: React.FC<Props> = (props) => {
  const [expanded, setExpanded] = useState(false);

  type ItemProps = {
    title: string;
    prompt: string;
  };

  // 上位の setExpanded にアクセスするためにコンポーネントをネストする
  const Item: React.FC<ItemProps> = (props) => {
    const navigate = useNavigate();
    const addPrompt = useCallback(() => {
      navigate('/chat', {
        state: {
          content: props.prompt,
        },
        replace: true,
      });

      setExpanded(false);
    }, [props, navigate]);

    return (
      <li className="my-2 cursor-pointer hover:underline" onClick={addPrompt}>
        {props.title}
      </li>
    );
  };

  return (
    <>
      {expanded && (
        <div
          className={`${props.className} fixed left-0 top-0 h-screen w-screen bg-gray-900/90`}
          onClick={() => {
            setExpanded(false);
          }}
        />
      )}

      <div
        className={`absolute top-0 transition-all ${
          expanded ? 'right-0' : 'right-[-16rem]'
        } flex h-full w-[18.5rem] justify-center`}>
        <div
          className="bg-aws-smile mt-16 flex h-12 w-12 cursor-pointer items-center justify-center rounded-l-full"
          onClick={() => {
            setExpanded(!expanded);
          }}>
          <PiQuestion className="text-aws-squid-ink h-6 w-6" />
        </div>

        <div className="bg-aws-squid-ink scrollbar-thin scrollbar-thumb-white h-full w-full overflow-y-scroll break-words p-3 text-sm text-white">
          <div className="mb-4 mt-2 flex items-center text-sm font-semibold">
            <PiBookOpenText className="mr-1.5 text-lg" />
            プロンプト例
          </div>
          <ExpandableMenu title="コンテンツ生成" className="my-2">
            <ul className="pl-4">
              <Item
                title="テキストの書き換え"
                prompt={`以下の <text></text> の xml タグに囲われたテキストを、<instruction></instruction> の xml タグに囲われた指示で書き替えてください。

<instruction>より詳細に</instruction>

<text>
1758年、スウェーデンの植物学者であり動物学者でもあったカール・リンネは、その著書『自然科学体系（Systema Naturae）』において、2単語による種の命名法（二命名法）を発表した。カニスはラテン語で "犬 "を意味し、彼はこの属の下に家犬、オオカミ、イヌジャッカルを挙げた。
</text>

出力は <output>からはじめ、</output> タグで終えてください。`}
              />
              <Item
                title="箇条書きに説明をつける"
                prompt={`以下の <list></list> の xml タグに囲まれた箇条書きは、<content></content> の xml タグに囲まれた内容の特徴の要点を言及したものです。
<list>
* 静的型付けができる
* JavaScriptとの互換性が高い
* 大規模な開発に適している
* コンパイル時に型チェックが行われる
* オプションで型アノテーションができる
* インターフェース、ジェネリック、列挙型などの機能がある
* 最新のECMAScript機能をサポートしている
* コンパイル結果が純粋なJavaScriptコードになる
* VSCodeなどのエディタの補完機能との相性が良い
</list>
<content>TypeScript</content>
要点を詳しく説明し、それぞれの説明の上に対応する要点を一字一句コピーしてください。
出力は <output>からはじめ、</output> タグで終えてください。`}
              />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="選択肢を与えて分類する" className="my-2">
            <ul className="pl-4">
              <Item title="選択肢を与えて分類する" prompt={``} />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="テキスト処理" className="my-2">
            <ul className="pl-4">
              <Item title="情報抽出" prompt={``} />
              <Item title="個人情報削除" prompt={``} />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="テキスト分析基礎編" className="my-2">
            <ul className="pl-4">
              <Item title="テキストの類似度を評価する" prompt={``} />
              <Item title="入力テキストに対するQA" prompt={``} />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="ロールプレイによる対話" className="my-2">
            <ul className="pl-4">
              <Item title="キャリアのコーチ" prompt={``} />
              <Item title="カスタマーサポート" prompt={``} />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="コンテンツモデレーション" className="my-2">
            <ul className="pl-4">
              <Item title="コンテンツモデレーション" prompt={``} />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="プログラミング" className="my-2">
            <ul className="pl-4">
              <Item title="コードを書かせる" prompt={``} />
              <Item title="コードを解説させる" prompt={``} />
              <Item title="コードを修正させる" prompt={``} />
            </ul>
          </ExpandableMenu>
        </div>
      </div>
    </>
  );
};

export default PromptList;
