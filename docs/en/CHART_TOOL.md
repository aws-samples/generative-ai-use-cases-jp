# ECharts Visualization

GenU's frontend renders charts using ECharts when it detects a ` ```chart ` code block in Markdown.

## How It Works

The agent writes a ` ```chart ` code block containing JSON in its response. The frontend parses and renders it as an interactive chart.

````
```chart
{"type":"bar","title":"Sales","data":[{"name":"Q1","value":100},{"name":"Q2","value":150}]}
```
````

## Supported Chart Types

`bar`, `line`, `pie`, `area`, `scatter`, `boxplot`, `heatmap`, `radar`, `candlestick`, `map`

## JSON Structure

Top-level fields:

| Field        | Type   | Required | Description                                            |
| ------------ | ------ | -------- | ------------------------------------------------------ |
| `type`       | string | ✓        | One of the supported chart types                       |
| `title`      | string |          | Chart title                                            |
| `xAxisLabel` | string |          | X-axis label                                           |
| `yAxisLabel` | string |          | Y-axis label                                           |
| `data`       | array  |          | Single-series data points                              |
| `series`     | array  |          | Multi-series data (mutually exclusive with `data`)     |
| `options`    | object |          | Raw ECharts options, deep-merged into generated config |

## Data Formats

### Common Options

All chart types support a `color` field (CSS color string) on data points for per-item coloring:

```json
{ "name": "Q1", "value": 100, "color": "#e74c3c" }
```

### Basic Charts (bar, line, pie, area)

Single series:

```json
{
  "type": "line",
  "title": "Monthly Sales",
  "xAxisLabel": "Month",
  "yAxisLabel": "Sales ($k)",
  "data": [
    { "name": "Jan", "value": 120 },
    { "name": "Feb", "value": 150 },
    { "name": "Mar", "value": 180 }
  ]
}
```

Multiple series:

```json
{
  "type": "bar",
  "title": "Department Sales Comparison",
  "series": [
    {
      "name": "Dept A",
      "data": [
        { "name": "Q1", "value": 100 },
        { "name": "Q2", "value": 120 }
      ]
    },
    {
      "name": "Dept B",
      "data": [
        { "name": "Q1", "value": 80 },
        { "name": "Q2", "value": 95 }
      ]
    }
  ]
}
```

### Scatter

Single series (value format):

```json
{
  "type": "scatter",
  "title": "Height vs Weight",
  "xAxisLabel": "Height (cm)",
  "yAxisLabel": "Weight (kg)",
  "data": [
    { "name": "A", "value": [170, 65] },
    { "name": "B", "value": [165, 58] }
  ]
}
```

Single series (x/y format with optional color):

```json
{
  "type": "scatter",
  "title": "Birth Rate vs Medical Cost",
  "xAxisLabel": "Birth Rate",
  "yAxisLabel": "Medical Cost (10k JPY)",
  "data": [
    { "name": "Okinawa", "x": 8.7, "y": 359.9, "color": "#2ecc71" },
    { "name": "Tokyo", "x": 6.4, "y": 356.5, "color": "#e74c3c" }
  ]
}
```

Multiple series (color-coded by group):

```json
{
  "type": "scatter",
  "title": "Height vs Weight by Gender",
  "xAxisLabel": "Height (cm)",
  "yAxisLabel": "Weight (kg)",
  "series": [
    {
      "name": "Male",
      "data": [
        { "name": "A", "value": [170, 70] },
        { "name": "B", "value": [175, 75] }
      ]
    },
    {
      "name": "Female",
      "data": [
        { "name": "C", "value": [155, 50] },
        { "name": "D", "value": [160, 55] }
      ]
    }
  ]
}
```

### Boxplot

data is an array of `[min, Q1, median, Q3, max]`:

```json
{
  "type": "boxplot",
  "title": "Test Score Distribution",
  "labels": ["Math", "English", "Science"],
  "data": [
    [40, 55, 70, 82, 95],
    [35, 50, 65, 78, 90],
    [45, 60, 72, 85, 98]
  ]
}
```

### Heatmap

data is an array of objects with `x` (xLabels index), `y` (yLabels index), and `value` (number or `null` for missing data).

```json
{
  "type": "heatmap",
  "title": "Prefecture Metrics (2023)",
  "xLabels": ["Birth Rate", "Death Rate"],
  "yLabels": ["Okinawa", "Tokyo", "Akita"],
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

### Radar

```json
{
  "type": "radar",
  "title": "Skill Comparison",
  "indicators": [
    { "name": "Attack", "max": 100 },
    { "name": "Defense", "max": 100 },
    { "name": "Speed", "max": 100 }
  ],
  "data": [
    { "name": "Player A", "value": [80, 60, 90] },
    { "name": "Player B", "value": [70, 85, 65] }
  ]
}
```

### Candlestick

data is an array of `[open, close, low, high]`:

```json
{
  "type": "candlestick",
  "title": "Stock Price",
  "dates": ["2024-01-01", "2024-01-02", "2024-01-03"],
  "data": [
    [100, 105, 98, 108],
    [105, 102, 100, 107],
    [102, 110, 101, 112]
  ]
}
```

### Map

Supported scopes:

- `region: "world"` — World country-level map
- `region: "japan"` with `detail: "prefecture"` — Japan prefecture-level map (47 prefectures)
- `region: "japan"` with `detail: "municipality"` and `prefecture: "XX"` — Municipality-level map for a specific prefecture

`prefecture` is a 2-digit zero-padded JIS X 0401 prefecture code ("01"–"47"):
01=Hokkaido, 02=Aomori, 03=Iwate, 04=Miyagi, 05=Akita, 06=Yamagata, 07=Fukushima, 08=Ibaraki, 09=Tochigi, 10=Gunma, 11=Saitama, 12=Chiba, 13=Tokyo, 14=Kanagawa, 15=Niigata, 16=Toyama, 17=Ishikawa, 18=Fukui, 19=Yamanashi, 20=Nagano, 21=Gifu, 22=Shizuoka, 23=Aichi, 24=Mie, 25=Shiga, 26=Kyoto, 27=Osaka, 28=Hyogo, 29=Nara, 30=Wakayama, 31=Tottori, 32=Shimane, 33=Okayama, 34=Hiroshima, 35=Yamaguchi, 36=Tokushima, 37=Kagawa, 38=Ehime, 39=Kochi, 40=Fukuoka, 41=Saga, 42=Nagasaki, 43=Kumamoto, 44=Oita, 45=Miyazaki, 46=Kagoshima, 47=Okinawa

Prefecture map example:

```json
{
  "type": "map",
  "title": "Population by Prefecture",
  "region": "japan",
  "detail": "prefecture",
  "data": [
    { "name": "Tokyo", "value": 1400 },
    { "name": "Osaka", "value": 880 },
    { "name": "Hokkaido", "value": 520 }
  ]
}
```

Municipality map example:

```json
{
  "type": "map",
  "title": "Tokyo Municipality Population",
  "region": "japan",
  "detail": "municipality",
  "prefecture": "13",
  "data": [
    { "name": "Shinjuku", "value": 346 },
    { "name": "Shibuya", "value": 234 }
  ]
}
```

Use `colorStops` to customize the color gradient (defaults to a built-in palette). Each entry has `offset` (sort order, 0–1) and `color` (CSS color string):

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
  "data": [{ "name": "Tokyo", "value": 1400 }]
}
```

Note: Municipality map data sourced from MLIT National Land Numerical Information (N03, 2021).

Custom symbol paths (`symbol: "path://..."`) and image-based symbols (`symbol: "image://..."`) are not supported (filtered for security).

### Custom Options (options)

Use the `options` field to pass ECharts options directly. They are deep-merged into the generated chart options.

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

For all available options, refer to the ECharts documentation:
https://echarts.apache.org/en/option.html

**Note:** The following keys are blocked for security and ignored in `options`: `graphic`, `extraCssText`, `toolbox`, `brush`, `dataset`, `encode`, `link`, `sublink`, `target`, `renderItem`, `labelLayout`, `animationDelay`, `animationDurationUpdate`, `animationDelayUpdate`.

**Note:** When `options.series` is specified as an object (e.g. `{ type: 'line', ... }`), the `type` key is ignored because the chart builder sets series types. A `console.warn` is emitted in development. Use the array form for `series` if you need to specify `type`.

## Notes

- `data` and `series` are mutually exclusive. Use `data` for single series, `series` for multiple.
- Map charts (`map`) fetch GeoJSON dynamically, so first render may be slow.
- Frontend validates the JSON and falls back to displaying source code for invalid data.
