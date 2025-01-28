export const TimelinePrompt = `<instruction>
以下のウェブサイトの情報を参考に、Mermaid.jsのタイムライン図の記法を使ってシステムプロンプトを作成してください。以下の制約に従ってください:

1. 出力は必ずMermaid.jsのタイムライン図の記法に従ってください。
2. 挨拶やその他の前置きは一切出力しないでください。
3. 生成するタイムライン図の詳しい説明や解説は<Description></Description>タグの中に出力してください。
4. Mermaidの図のコードは \`\`\`mermaid から初めて \`\`\` で終わるように出力してください。
5. 次の<Information></Information>を参考に出力してください。

<Information>
構文
タイムライン図を作成するための構文を説明します: 
1. まず「timeline」キーワードで始めて、mermaidにタイムライン図を作成することを伝えます。
2. その後、タイムラインにタイトルを追加することができます。これは「title」キーワードの後にタイトルテキストを記述することで行います。
3. 次に、タイムラインのデータを追加します: 
   - 常に時間期間から始まり
   - コロン（:）が続き
   - その後にイベントのテキストを記述します
   - オプションで2つ目のコロンとイベントのテキストを追加できます
   - 1つの時期に対して1つまたは複数のイベントを設定できます

{time period} : {event}
もしくは
{time period} : {event} : {event}
もしくは
{time period} : {event}
              : {event}
              : {event}

注意: 時間期間もイベントも単純なテキストで、数字に限定されません。
上記の例の構文を見てみましょう。
（注: 前の例が提示されていないため、具体的な例を参照することはできませんが、時間期間とイベントは任意のテキストを使用できるということが重要なポイントです。例えば、「2023年」だけでなく「江戸時代」や「春」なども時間期間として使用できます。）
timeline
    title ソーシャルメディアプラットフォームの歴史
    2002年 : LinkedInの登場
    2004年 : Facebookの登場 : Googleの登場
    2005年 : Youtubeの登場
    2006年 : Twitterの登場

このように、テキストアウトラインを使用してタイムライン図を生成することができます。時間期間とイベントの順序は、次の理由で重要です: 
タイムラインの水平方向の配置: 
- 最初の時間期間はタイムラインの左側に配置
- 最後の時間期間はタイムラインの右側に配置
特定の時間期間内での垂直方向の配置: 
- 最初のイベントはその時間期間の上部に配置
- 最後のイベントはその時間期間の下部に配置
このように、入力する順序がそのまま視覚的な配置に反映されます。

Grouping of time periods in sections/ages
時間期間をセクション/時代でグループ化することができます。これは「section」キーワードの後にセクション名を記述することで実現できます。
新しいセクションが定義されるまで、それ以降のすべての時間期間は、そのセクションに配置されます。
セクションが定義されていない場合、すべての時間期間はデフォルトセクションに配置されます。
セクションでグループ化された時間期間の例を見てみましょう。
timeline
    title 産業革命のタイムライン
    section 17〜20世紀 セクション
        産業 1.0 : 機械水力、蒸気力
        産業 2.0 : 電気<br>内燃機関<br>大量生産
        産業 3.0 : 電子機器<br>コンピュータ<br>自動化
    section 21世紀 セクション
        産業 4.0 : インターネット<br>ロボット工学<br>モノのインターネット
        産業 5.0 : 人工知能<br>ビッグデータ<br>3Dプリンティング

ご覧のように、期間は各セクションに配置され、セクションは定義された順序で配置されています。
特定のセクション内のすべての期間とイベントは、同様の配色に従っています。これは、期間とイベントの関係性をより分かりやすくするために行われています。

Wrapping of text for long time-periods or events
デフォルトでは、期間やイベントのテキストが長すぎる場合は折り返されます。これは、テキストが図の外にはみ出すのを避けるために行われています。
また、<br>を使用して強制的に改行することもできます。以下の〇ぐらいの感覚で<br>を入れてください。
長い期間と長いイベントがある別の例を見てみましょう。
timeline
title イギリスの歴史タイムライン
section 石器時代
紀元前7600年 : イギリスで最古の家が<br>スコットランドの<br>オークニーに建てられる
紀元前6000年 : 海面が上昇し、<br>イギリスが島となる。<br>この地に住む人々は<br>狩猟採集民族だった。
section 青銅器時代
紀元前2300年 : ヨーロッパから人々が<br>到来しイギリスに定住。<br>彼らは農業と金属加工の<br>技術をもたらした。
: 新しい様式の陶器や<br>埋葬方法が出現。
紀元前2200年 : ストーンヘンジでの<br>主要な建造工事が完了。<br>人々は石の環状列石に<br>死者を埋葬するようになる。
: イギリスで最初の<br>金属製品が作られる。<br>その他の素晴らしい<br>出来事が起こる。<br>生きるのに<br>良い時代となる。

例: 
timeline
        title MermaidChart 2023 Timeline
        section 2023 Q1 <br> Release Personal Tier
          Bullet 1 : sub-point 1a : sub-point 1b
               : sub-point 1c
          Bullet 2 : sub-point 2a : sub-point 2b
        section 2023 Q2 <br> Release XYZ Tier
          Bullet 3 : sub-point <br> 3a : sub-point 3b
               : sub-point 3c
          Bullet 4 : sub-point 4a : sub-point 4b

Styling of time periods and events
先ほど説明したように、各セクションには配色があり、セクション内の各期間とイベントは同様の配色に従います。
ただし、セクションが定義されていない場合、以下の2つの可能性があります:
期間を個別にスタイル設定する、つまり、各期間（および対応するイベント）がそれぞれ独自の配色を持つことになります。これがデフォルトの動作です。
%%{init: { 'logLevel': 'debug', 'theme': 'base', 'timeline': {'disableMulticolor': true}}}%%
timeline
    title History of Social Media Platform
        2002 : LinkedIn
        2004 : Facebook : Google
        ...

Customizing Color scheme
cScale0からcScale11のテーマ変数を使用して配色をカスタマイズできます。これにより背景色が変更されます。Mermaidでは最大12のセクションに対して固有の色を設定できます。cScale0変数は最初のセクションまたは期間の値を制御し、cScale1は2番目のセクションの値を制御、といった具合です。12以上のセクションがある場合、配色は繰り返し使用されます。
セクションの前景色（文字色）も変更したい場合は、cScaleLabel0からcScaleLabel11までの対応するテーマ変数を使用して変更できます。
注意: これらのテーマ変数のデフォルト値は、選択されたテーマから取得されます。デフォルト値を上書きしたい場合は、initialize呼び出しを使用してカスタムテーマ変数の値を追加できます。
例: 
cScale0からcScale2までの変数のデフォルト値を上書きしてみましょう:
%%{init: { 'logLevel': 'debug', 'theme': 'default' , 'themeVariables': {
            'cScale0': '#ff0000', 'cScaleLabel0': '#ffffff',
            'cScale1': '#00ff00',
            'cScale2': '#0000ff', 'cScaleLabel2': '#ffffff'
    } } }%%
    timeline
    title History of Social Media Platform
        2002 : LinkedIn
        2004 : Facebook : Google
        ...

Themes
Mermaidには多数の事前定義されたテーマが用意されており、お好みのものを選んで使用できます。補足: 実際には、既存のテーマ変数を上書きして、独自のカスタムテーマを作成することもできます。図のテーマ設定についての詳細は、こちらで学ぶことができます。
以下が、事前定義された異なるテーマオプションです: 
- base
- forest
- dark
- default
- neutral
例:
%%{init: { 'logLevel': 'debug', 'theme': 'base' } }%%
もしくは
%%{init: { 'logLevel': 'debug', 'theme': 'forest' } }%%
もしくは
%%{init: { 'logLevel': 'debug', 'theme': 'dark' } }%%
もしくは
%%{init: { 'logLevel': 'debug', 'theme': 'default' } }%%
もしくは
%%{init: { 'logLevel': 'debug', 'theme': 'neutral' } }%%
</Information>

出力フォーマット:
<Description>
[生成するタイムライン図の詳しい説明や解説]
</Description>

\`\`\`mermaid
[Mermaid.jsのタイムライン図の記法]
\`\`\`

</instruction>`;
