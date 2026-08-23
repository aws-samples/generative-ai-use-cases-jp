# PowerPoint 生成

AgentCore ユースケースのエージェントは、`create_powerpoint` ツールで PowerPoint ファイル（.pptx）を作成できます。

## 仕組み

エージェントはスライドを**構造で指定**します。図形の座標を組み立てるのではなく、スライドの種別（`type`）と、その種別が必要とする項目を渡します。描画は [packages/cdk/lambda-python/generic-agent-core-runtime/src/pptx_builder.py](/packages/cdk/lambda-python/generic-agent-core-runtime/src/pptx_builder.py) が担当します。

作られたファイルは作業ディレクトリ（`/tmp/ws`）に保存されます。利用者に渡すには、続けて `upload_file_to_s3_and_retrieve_s3_url` でアップロードしてください（エージェントのシステムプロンプトにその指示が入っています）。

このツールは `createGenericAgentCoreRuntime` および Agent Builder の両方で利用できます。有効化の方法は [デプロイオプション](./DEPLOY_OPTION.md) を参照してください。

## 引数

| 引数         | 説明                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `filename`   | 出力ファイル名。`.pptx` が無ければ補われます。パスは無視され、常に作業ディレクトリ直下に作られます |
| `slides`     | スライドの配列。順番どおりに並びます                                                               |
| `deck_title` | 各ページのフッターに出る資料名。省略するとフッターとページ番号を出しません                         |

## 共通の項目

全面デザインの種別（`title` / `section`）を除く全種別で、次の項目が使えます。

| 項目      | 説明                                                         |
| --------- | ------------------------------------------------------------ |
| `kicker`  | 見出しの上に出る短いラベル。大文字化されます                 |
| `title`   | 見出し。**話題ではなく結論**を書くと資料が読みやすくなります |
| `message` | 見出しの下に置くキーメッセージ。最大2行                      |
| `notes`   | 発表者ノート                                                 |

## スライド種別

| 種別           | 主な項目                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `title`        | `title`, `subtitle`, `footnote`                                                                                       |
| `section`      | `number`, `title`                                                                                                     |
| `agenda`       | `items[]`                                                                                                             |
| `bullets`      | `bullets[]`                                                                                                           |
| `kpi`          | `items[]{label, value, unit, note}`（2〜4個）                                                                         |
| `chart`        | `chart_type`(column/bar/line/pie), `categories[]`, `series[]{name, values[]}`, `insight[]`, `insight_title`           |
| `table`        | `rows[][]`（先頭行がヘッダー）, `column_widths[]`                                                                     |
| `columns`      | `columns[]{title, items[], highlight}`（2〜4列）                                                                      |
| `quadrant`     | `x_axis`, `y_axis`, `quadrants{top_left, top_right, bottom_left, bottom_right}`, `points[]{label, x, y, highlight}`   |
| `architecture` | `nodes[]{label, note, highlight}`（2〜5個）                                                                           |
| `sequence`     | `actors[]`, `highlight`, `legend`, `messages[]{from, to, label, return}`                                              |
| `swimlane`     | `columns[]`, `lanes[]{name, bars[]{start, span, label, tone}}`, `milestones[]{column, label}`, `today`, `today_label` |
| `flow`         | `columns`(1/2・省略時は自動), `steps[]{type(start/process/decision/end), label, no_branch, yes_label, no_label}`      |
| `logictree`    | `direction`(right/down), `root{label, note, highlight, children[]}`                                                   |
| `code`         | `code`, `caption`                                                                                                     |
| `flow`         | 1列に入らなければ2列に折り返す。2列でも入らなければエラー                                                             |

### logictree の2つの向き

同じ木の描画を向きで使い分けます。

- `direction: "right"`（既定）— 左に問いを置いて右へ分解する。**ロジックツリー／イシューツリー**
- `direction: "down"` — 親の下に子をぶら下げる。**組織図**

どちらも「各サブツリーは、その葉が必要とする幅（高さ）を確保する」規則で配置するので、枝の数が偏っても崩れません。

## 指定の例

```json
[
  {
    "type": "title",
    "title": "サービス改善の方針",
    "subtitle": "2026 年下期"
  },
  {
    "type": "kpi",
    "kicker": "Status",
    "title": "問い合わせは減ったが解決率が伸びていない",
    "message": "件数の削減は目標を超えた。次の課題は一次解決率。",
    "items": [
      {
        "label": "問い合わせ件数",
        "value": "1,240",
        "unit": "件",
        "note": "前年同期比 -34%"
      },
      { "label": "一次解決率", "value": "62", "unit": "%", "note": "目標 75%" }
    ]
  },
  {
    "type": "flow",
    "kicker": "Flow",
    "title": "エスカレーションの判断",
    "steps": [
      { "type": "start", "label": "問い合わせを受け付ける" },
      {
        "type": "decision",
        "label": "FAQ で解決できるか",
        "no_branch": "担当者へ引き継ぐ",
        "yes_label": "はい",
        "no_label": "いいえ"
      },
      { "type": "end", "label": "その場で回答する" }
    ]
  }
]
```

## 収まらないときはエラーになります

内容が 1 枚に収まらない場合、ツールは縮小せずにエラーを返します。読めない資料が黙って出てくるより、エージェントに分割させたほうが良いためです。エラーには何枚目のどの種別かが含まれます。

```
slide 4 (agenda): agenda does not fit on one slide with 14 items; split it across slides
```

上限のあるものは次のとおりです。

| 種別              | 上限                       |
| ----------------- | -------------------------- |
| キーメッセージ    | 2 行                       |
| `swimlane`        | 10 列                      |
| `sequence`        | 6 アクター / 10 メッセージ |
| `code`            | 18 行                      |
| `logictree`       | 4 階層                     |
| `orgchart`        | 3 階層                     |
| `columns` / `kpi` | 2〜4 個                    |
| `architecture`    | 2〜5 個                    |

## 注意事項

- 文言はすべて指定した言語で出力されます。ツール側が文字列を補うのは `flow` の Yes / No のみで、これも `yes_label` / `no_label` で上書きできます
- スライドのサイズは 16:9 固定です
- 既存のテンプレート（.potx など）の読み込みには対応していません
