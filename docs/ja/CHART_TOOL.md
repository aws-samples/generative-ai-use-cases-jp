# ECharts Visualization

GenU のフロントエンドは、Markdown 内の ` ```chart ` コードブロックを検出すると ECharts でグラフとして描画します。

## 仕組み

エージェントがレスポンスに JSON を含む ` ```chart ` コードブロックを記述すると、フロントエンドがパースしてインタラクティブなグラフとして描画します。

````
```chart
{"type":"bar","title":"売上","data":[{"name":"Q1","value":100},{"name":"Q2","value":150}]}
```
````

## 対応グラフ種別

`bar`, `line`, `pie`, `area`, `scatter`, `boxplot`, `heatmap`, `radar`, `candlestick`, `map`

## JSON 構造

トップレベルのフィールド:

| フィールド   | 型     | 必須 | 説明                                                           |
| ------------ | ------ | ---- | -------------------------------------------------------------- |
| `type`       | string | ✓    | グラフの種類                                                   |
| `title`      | string |      | グラフのタイトル                                               |
| `xAxisLabel` | string |      | X軸のラベル                                                    |
| `yAxisLabel` | string |      | Y軸のラベル                                                    |
| `data`       | array  |      | 単一系列のデータポイント                                       |
| `series`     | array  |      | 複数系列のデータ（`data` と排他）                              |
| `options`    | object |      | ECharts オプションを直接指定（生成された設定にディープマージ） |

## データ形式

### 共通オプション

全チャートタイプで、データポイントに `color` フィールド（CSS カラー文字列）を指定すると個別に色を設定できます:

```json
{ "name": "Q1", "value": 100, "color": "#e74c3c" }
```

### 基本チャート (bar, line, pie, area)

単一系列:

```json
{
  "type": "line",
  "title": "月別売上",
  "xAxisLabel": "月",
  "yAxisLabel": "売上（万円）",
  "data": [
    { "name": "1月", "value": 120 },
    { "name": "2月", "value": 150 },
    { "name": "3月", "value": 180 }
  ]
}
```

複数系列:

```json
{
  "type": "bar",
  "title": "部門別売上比較",
  "series": [
    {
      "name": "部門A",
      "data": [
        { "name": "Q1", "value": 100 },
        { "name": "Q2", "value": 120 }
      ]
    },
    {
      "name": "部門B",
      "data": [
        { "name": "Q1", "value": 80 },
        { "name": "Q2", "value": 95 }
      ]
    }
  ]
}
```

### 散布図 (scatter)

単一系列（value 形式）:

```json
{
  "type": "scatter",
  "title": "身長と体重の相関",
  "xAxisLabel": "身長(cm)",
  "yAxisLabel": "体重(kg)",
  "data": [
    { "name": "A", "value": [170, 65] },
    { "name": "B", "value": [165, 58] }
  ]
}
```

単一系列（x/y 形式、color 指定可）:

```json
{
  "type": "scatter",
  "title": "出生率 vs 医療費",
  "xAxisLabel": "出生率",
  "yAxisLabel": "医療費（万円）",
  "data": [
    { "name": "沖縄県", "x": 8.7, "y": 359.9, "color": "#2ecc71" },
    { "name": "東京都", "x": 6.4, "y": 356.5, "color": "#e74c3c" }
  ]
}
```

複数系列（グループ別に色分け）:

```json
{
  "type": "scatter",
  "title": "性別ごとの身長×体重",
  "xAxisLabel": "身長(cm)",
  "yAxisLabel": "体重(kg)",
  "series": [
    {
      "name": "男性",
      "data": [
        { "name": "A", "value": [170, 70] },
        { "name": "B", "value": [175, 75] }
      ]
    },
    {
      "name": "女性",
      "data": [
        { "name": "C", "value": [155, 50] },
        { "name": "D", "value": [160, 55] }
      ]
    }
  ]
}
```

### 箱ひげ図 (boxplot)

data は `[min, Q1, median, Q3, max]` の配列:

```json
{
  "type": "boxplot",
  "title": "テスト得点分布",
  "labels": ["数学", "英語", "国語"],
  "data": [
    [40, 55, 70, 82, 95],
    [35, 50, 65, 78, 90],
    [45, 60, 72, 85, 98]
  ]
}
```

### ヒートマップ (heatmap)

data は `x`（xLabels の添字）、`y`（yLabels の添字）、`value`（数値または欠損時 `null`）を持つオブジェクトの配列。

```json
{
  "type": "heatmap",
  "title": "都道府県別指標（2023年）",
  "xLabels": ["出生率", "死亡率"],
  "yLabels": ["沖縄県", "東京都", "秋田県"],
  "data": [
    { "x": 0, "y": 0, "value": 8.7 },
    { "x": 1, "y": 0, "value": 10.5 },
    { "x": 0, "y": 1, "value": 6.4 },
    { "x": 1, "y": 1, "value": 10.2 },
    { "x": 0, "y": 2, "value": 4.0 },
    { "x": 1, "y": 2, "value": 19.3 }
  ]
}
```

### レーダーチャート (radar)

```json
{
  "type": "radar",
  "title": "スキル比較",
  "indicators": [
    { "name": "攻撃", "max": 100 },
    { "name": "防御", "max": 100 },
    { "name": "速度", "max": 100 }
  ],
  "data": [
    { "name": "プレイヤーA", "value": [80, 60, 90] },
    { "name": "プレイヤーB", "value": [70, 85, 65] }
  ]
}
```

### ローソク足 (candlestick)

data は `[open, close, low, high]` の配列:

```json
{
  "type": "candlestick",
  "title": "株価推移",
  "dates": ["2024-01-01", "2024-01-02", "2024-01-03"],
  "data": [
    [100, 105, 98, 108],
    [105, 102, 100, 107],
    [102, 110, 101, 112]
  ]
}
```

### 地図 (map)

対応範囲:

- `region: "world"` — 国単位の世界地図
- `region: "japan"` + `detail: "prefecture"` — 都道府県単位の日本地図（47都道府県）
- `region: "japan"` + `detail: "municipality"` + `prefecture: "XX"` — 特定都道府県の市区町村地図

`prefecture` は JIS X 0401 都道府県コード（2桁、ゼロ埋め）:
01=北海道, 02=青森, 03=岩手, 04=宮城, 05=秋田, 06=山形, 07=福島, 08=茨城, 09=栃木, 10=群馬, 11=埼玉, 12=千葉, 13=東京, 14=神奈川, 15=新潟, 16=富山, 17=石川, 18=福井, 19=山梨, 20=長野, 21=岐阜, 22=静岡, 23=愛知, 24=三重, 25=滋賀, 26=京都, 27=大阪, 28=兵庫, 29=奈良, 30=和歌山, 31=鳥取, 32=島根, 33=岡山, 34=広島, 35=山口, 36=徳島, 37=香川, 38=愛媛, 39=高知, 40=福岡, 41=佐賀, 42=長崎, 43=熊本, 44=大分, 45=宮崎, 46=鹿児島, 47=沖縄

都道府県マップ例:

```json
{
  "type": "map",
  "title": "都道府県別人口",
  "region": "japan",
  "detail": "prefecture",
  "data": [
    { "name": "東京都", "value": 1400 },
    { "name": "大阪府", "value": 880 },
    { "name": "北海道", "value": 520 }
  ]
}
```

市区町村マップ例:

```json
{
  "type": "map",
  "title": "東京都市区町村別人口",
  "region": "japan",
  "detail": "municipality",
  "prefecture": "13",
  "data": [
    { "name": "新宿区", "value": 346 },
    { "name": "渋谷区", "value": 234 }
  ]
}
```

`colorStops` で色のグラデーションをカスタマイズできます（省略時はデフォルト配色）。各要素は `offset`（0〜1 の順序）と `color`（CSS カラー文字列）を持ちます:

```json
{
  "type": "map",
  "region": "japan",
  "detail": "prefecture",
  "colorStops": [
    { "offset": 0, "color": "#ffffcc" },
    { "offset": 0.5, "color": "#fd8d3c" },
    { "offset": 1, "color": "#800026" }
  ],
  "data": [{ "name": "東京都", "value": 1400 }]
}
```

注: 市区町村の地図データは国土交通省 国土数値情報（N03、2021年）を使用しています。

カスタム symbol パス（`symbol: "path://..."`）および画像ベースのシンボル（`symbol: "image://..."`）はセキュリティのためブロックされます。

### カスタムオプション (options)

`options` フィールドで ECharts のオプションを直接指定できます。
生成されたチャートオプションに deep merge されます。

```json
{
  "type": "bar",
  "data": [
    { "name": "A", "value": 10 },
    { "name": "B", "value": 20 }
  ],
  "options": {
    "yAxis": { "min": 0, "max": 30 },
    "series": [{ "stack": "total", "label": { "show": true } }],
    "legend": { "show": false }
  }
}
```

利用可能なオプションは ECharts 公式ドキュメントを参照してください:
https://echarts.apache.org/en/option.html

**注意:** セキュリティのため以下のキーは `options` に指定しても無視されます: `graphic`, `extraCssText`, `toolbox`, `brush`, `dataset`, `encode`, `link`, `sublink`, `target`, `renderItem`, `labelLayout`, `animationDelay`, `animationDurationUpdate`, `animationDelayUpdate`。

**注意:** `options.series` をオブジェクト形式 (`{ type: 'line', ... }`) で指定した場合、`type` キーはビルダーが設定するため無視されます。開発環境では `console.warn` が出力されます。`type` を指定する必要がある場合は、`series` を配列形式で使用してください。

## 注意事項

- `data` と `series` は排他。単一系列なら `data`、複数系列なら `series` を使用
- 地図 (`map`) は GeoJSON を動的に取得するため、初回表示に時間がかかる場合がある
- フロントエンドは JSON のバリデーションを行い、不正なデータの場合はソースコードを表示する
