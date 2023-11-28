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
              <Item title="選択肢を与えて分類する" prompt={`あなたは、電子メールをタイプ別に分類しているカスタマーサービス担当者です。
<mail></mail> の xml タグに囲われた文章を <category></category> の xml タグに囲われたカテゴリーに分類してください。
<mail>
こんにちは。私の Mixmaster4000 は、操作すると奇妙なノイズを発生します。
また、電子機器が燃えているような、少し煙のような、プラスチックのようなにおいがします。交換が必要です。
</mail>
<category>
(A) 販売前の質問
(B) 故障または不良品
(C) 請求に関する質問
(D) その他(説明してください)
</category>
出力は <output>からはじめ、</output> タグで終え、タグ内には A,B,C,D のどれかだけを記述してください。
ただし D の場合のみ説明を記述してください。
`} />
            </ul>
          </ExpandableMenu>
          <ExpandableMenu title="テキスト処理" className="my-2">
            <ul className="pl-4">
              <Item title="情報抽出" prompt={`以下の <text></text> の xml タグに囲われた文章からメールアドレスを正確に抽出してください。
またメールアドレスとして成り立っていないものは抽出しないでください。
<text>
私の連絡先は、hoge@example.comです。よく hoge@example のように間違えられるので注意してください。
また、hoge+fuga@example.com や hoge@examples.jp でも受け取ることができます。
メールが使えない方は、https://example.jp/qa のお問い合わせフォームから問い合わせることもできます。
</text>
ただし出力は、<output>からはじめ、</output> タグで終え、1 行に 1 つずつ記入してください。
メールアドレスは、入力テキストに正確に綴られている場合のみ記入してください。
本文中にメールアドレスがない場合は、「N/A」と記入してください。それ以外は何も書かないでください。`} />
              <Item title="個人情報削除" prompt={`テキストを提供します。このテキストから個人を特定する情報をすべて削除し、XXXに置き換えたい。名前、電話番号、自宅や電子メールアドレスなどのPIIをXXXに置き換えることは非常に重要です。

入力者は、文字と文字の間にスペースを挿入したり、文字と文字の間に改行を入れたりして、PIIを偽装しようとするかもしれません。

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

以下 <text></text> の xml タグに囲まれたテキストから個人情報を XXX に置き換えてください。

<text>
私は源頼朝です。鎌倉時代の武将です。連絡先は yoritomo-minamoto
@kamakura-bakuhu.go.jp もしくは 0467-
12-
3456
です。
</text>

個人情報を XXX に置き換えたテキストを <output>からはじめ、</output> タグで終えて出力してください。`} />
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
