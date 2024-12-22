import React, { useState } from 'react';
import { IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';
import { LuFileEdit } from 'react-icons/lu';

const SlideMarkdownHelp: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full flex-row items-center justify-between p-4"
        aria-expanded={isExpanded}>
        <div className="flex items-center gap-1 font-bold">
          <LuFileEdit className="ml-1 mr-1 size-5" />
          <span className="text-sm">スライドの書き方ガイド</span>
        </div>
        {isExpanded ? (
          <IoChevronUpOutline className="size-5 text-gray-600" />
        ) : (
          <IoChevronDownOutline className="size-5 text-gray-600" />
        )}
      </button>

      <div
        className={`prose prose-sm max-w-none overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          isExpanded
            ? 'max-h-[80vh] overflow-y-auto opacity-100'
            : 'max-h-0 opacity-0'
        }`}>
        <div className="space-y-2 p-6 pt-0">
          {/* 基本的な構造の説明 */}
          <section>
            <h3 className="text-lg font-semibold">基本的な構造</h3>
            <p className="text-gray-600">
              スライドは <code>---</code>
              （ハイフン3つ）で区切ります。各スライドではMarkdown記法が使えます。
            </p>
            <pre className="rounded-md bg-gray-200 p-3 text-sm text-gray-700">
              {`# 最初のスライド
これは1枚目のスライドです

---

# 2枚目のスライド
- 箇条書きも使えます
- 2つ目の項目

---

# 3枚目のスライド`}
            </pre>
          </section>

          {/* 基本的なMarkdown記法 */}
          <section>
            <h3 className="text-lg font-semibold">基本的なMarkdown記法</h3>
            <div>
              <h4 className="mb-2 font-medium">記法例</h4>
              <pre className="rounded-md bg-gray-200 p-3 text-sm text-gray-700">
                {`# 見出し1
## 見出し2
### 見出し3

**太字**
*斜体*

- 箇条書き1
- 箇条書き2
  - ネスト1
  - ネスト2

1. 番号付き1
2. 番号付き2

[リンク](https://example.com)

![画像](image.jpg)`}
              </pre>
            </div>
          </section>

          {/* スライド特有の機能 */}
          <section>
            <h3 className="text-lg font-semibold">スライド特有の機能</h3>

            {/* コードブロック */}
            <div className="mb-4">
              <h4 className="font-medium">コードブロック</h4>
              <p className="mb-2 text-gray-600">
                バッククォート３つでコードブロックを作成。言語も指定できます。
              </p>
              <pre className="rounded-md bg-gray-200 p-3 text-sm text-gray-700">
                {`\`\`\`python
def hello():
    print("Hello, World!")
\`\`\``}
              </pre>
            </div>

            {/* 表 */}
            <div>
              <h4 className="font-medium">表の作成</h4>
              <p className="mb-2 text-gray-600">
                パイプ記号<code>|</code>
                で列を区切ります。ヘッダーとボディの区切りにはハイフンを２つ
                <code>--</code>使用してください。
              </p>
              <pre className="bg-gray-150 rounded bg-gray-200 p-3 text-sm text-gray-700">
                {`|列1|列2|列3|
|--|--|--|
|A1|B1|C1|
|A2|B2|C2|`}
              </pre>
            </div>
          </section>

          {/* スタイリング */}
          <section>
            <h3 className="text-lg font-semibold">スタイリングとレイアウト</h3>
            <div className="space-y-2">
              <p className="text-gray-600">HTMLタグとCSSクラスも使用できます</p>
              <pre className="bg-gray-150 rounded bg-gray-200 p-3 text-sm text-gray-700">
                {`<div class="bg-blue-100 p-4">
  スタイリングされたブロック
</div>

<div class="grid grid-cols-2 gap-4">
  <div>左カラム</div>
  <div>右カラム</div>
</div>`}
              </pre>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold">特殊な記法</h3>
            <div className="space-y-2">
              <h4 className="font-medium">背景画像の挿入</h4>
              <p className="text-gray-600">背景画像の挿入</p>
              <pre className="bg-gray-150 rounded bg-gray-200 p-3 text-sm text-gray-700">
                {`<!-- .slide: data-background-image="url" -->`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">スライドの遷移効果の指定</h4>
              <p className="text-gray-600">
                特定のスライドの遷移効果を指定します
              </p>
              <pre className="bg-gray-150 rounded bg-gray-200 p-3 text-sm text-gray-700">
                <code>&lt;!-- .slide: data-transition="zoom" --&gt;</code>
              </pre>
            </div>
          </section>

          {/* 便利な機能やTips */}
          <section>
            <h3 className="text-lg font-semibold">💡 便利なTips</h3>
            <ul className="list-disc space-y-2 pl-5 text-gray-600">
              <li>長いスライドは垂直方向に分割して整理しましょう</li>
              <li>重要な部分は太字や色を使って強調できます</li>
              <li>画像は適切なサイズに調整してから使用します</li>
              <li>箇条書きは簡潔に、1項目につき1〜2行程度に</li>
              <li>全角スペースを使うと日本語との間隔を調整できます</li>
            </ul>
          </section>

          {/* 諸注意 */}
          <section>
            <h3 className="text-lg font-semibold">🚧 諸注意</h3>
            <ul className="list-disc space-y-2 pl-5 text-gray-600">
              <li>
                このスライドプレビューは{' '}
                <a href="https://revealjs.com/">Reveal.js</a>{' '}
                の記法に従います。より詳細な記法については公式ドキュメントを参照してください。
              </li>
              <li>
                現在、パワーポイント形式でダウンロードする機能には、スタイルを忠実に再現する機能は搭載されていないことにご注意ください。
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SlideMarkdownHelp;
