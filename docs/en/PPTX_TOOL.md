# PowerPoint Generation

Agents in the AgentCore use case can produce PowerPoint files (.pptx) with the `create_powerpoint` tool.

## How It Works

The agent describes slides **structurally**: instead of placing shapes, it passes a slide `type` and the fields that type needs. Rendering is handled by [packages/cdk/lambda-python/generic-agent-core-runtime/src/pptx_builder.py](/packages/cdk/lambda-python/generic-agent-core-runtime/src/pptx_builder.py).

The file is written to the workspace directory (`/tmp/ws`). To hand it to the user, the agent uploads it with `upload_file_to_s3_and_retrieve_s3_url`, which its system prompt instructs it to do.

The tool is available both with `createGenericAgentCoreRuntime` and in Agent Builder. See [Deploy Options](./DEPLOY_OPTION.md) for how to enable them.

## Arguments

| Argument     | Description                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `filename`   | Output file name. `.pptx` is appended when missing. Any directory part is dropped; the file is always created directly in the workspace |
| `slides`     | The slides to render, in order                                                                                                          |
| `deck_title` | Shown in the footer of every numbered slide. Omit it to leave out the footer and page numbers                                           |

## Common Fields

Every type except the full-bleed ones (`title`, `section`, `closing`, `quote`, `fullimage`) accepts these.

| Field     | Description                                                                                 |
| --------- | ------------------------------------------------------------------------------------------- |
| `kicker`  | A short label above the title, rendered in upper case                                       |
| `title`   | The heading. Writing **the conclusion rather than the topic** makes the deck easier to read |
| `message` | A key message under the title. Two lines at most                                            |
| `notes`   | Speaker notes                                                                               |

## Slide Types

| Type           | Main fields                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `title`        | `title`, `subtitle`, `footnote`                                                                                       |
| `section`      | `number`, `title`                                                                                                     |
| `closing`      | `title`, `subtitle`                                                                                                   |
| `agenda`       | `items[]`                                                                                                             |
| `bullets`      | `bullets[]`                                                                                                           |
| `statement`    | `body` (one or two short lines)                                                                                       |
| `takeaways`    | `items[]`                                                                                                             |
| `columns`      | `columns[]{title, items[], highlight}` (2 to 4)                                                                       |
| `kpi`          | `items[]{label, value, unit, note}` (2 to 4)                                                                          |
| `table`        | `rows[][]` (first row is the header), `column_widths[]`                                                               |
| `chart`        | `chart_type` (column/bar/line/pie), `categories[]`, `series[]{name, values[]}`, `insight[]`, `insight_title`          |
| `architecture` | `nodes[]{label, note, highlight}` (2 to 5)                                                                            |
| `sequence`     | `actors[]`, `highlight`, `legend`, `messages[]{from, to, label, return}`                                              |
| `swimlane`     | `columns[]`, `lanes[]{name, bars[]{start, span, label, tone}}`, `milestones[]{column, label}`, `today`, `today_label` |
| `flow`         | `steps[]{type(start/process/decision/end), label, no_branch, yes_label, no_label}`                                    |
| `orgchart`     | `root{name, note, children[]}`                                                                                        |
| `logictree`    | `root{label, highlight, children[]}`                                                                                  |
| `quadrant`     | `x_axis`, `y_axis`, `quadrants{top_left, top_right, bottom_left, bottom_right}`, `points[]{label, x, y, highlight}`   |
| `beforeafter`  | `before{title, items[]}`, `after{title, items[]}`                                                                     |
| `quote`        | `quote`, `author`, `source`                                                                                           |
| `fullimage`    | `image`, `title`, `subtitle`, `scrim`                                                                                 |
| `code`         | `code`, `caption`                                                                                                     |

## Example

```json
[
  {
    "type": "title",
    "title": "Support experience plan",
    "subtitle": "Second half of 2026"
  },
  {
    "type": "kpi",
    "kicker": "Status",
    "title": "Contacts are down but first-contact resolution is flat",
    "message": "Volume beat the target. Resolution is the next problem.",
    "items": [
      {
        "label": "Contacts",
        "value": "1,240",
        "unit": "cases",
        "note": "-34% year over year"
      },
      {
        "label": "First-contact resolution",
        "value": "62",
        "unit": "%",
        "note": "target 75%"
      }
    ]
  },
  {
    "type": "flow",
    "kicker": "Flow",
    "title": "When to escalate",
    "steps": [
      { "type": "start", "label": "Receive the request" },
      {
        "type": "decision",
        "label": "Does the FAQ answer it?",
        "no_branch": "Hand over to an agent"
      },
      { "type": "end", "label": "Answer immediately" }
    ]
  }
]
```

## Content That Does Not Fit Raises an Error

When the content cannot be drawn legibly, the tool raises an error instead of shrinking it. A caller can split the content and retry, but it cannot notice silently clipped output. The message names the slide and the type.

```
slide 4 (agenda): agenda does not fit on one slide with 14 items; split it across slides
```

The fixed limits are:

| Type              | Limit                  |
| ----------------- | ---------------------- |
| Key message       | 2 lines                |
| `swimlane`        | 10 columns             |
| `sequence`        | 6 actors / 10 messages |
| `code`            | 18 lines               |
| `logictree`       | 4 levels               |
| `orgchart`        | 3 levels               |
| `columns` / `kpi` | 2 to 4 entries         |
| `architecture`    | 2 to 5 entries         |

## Notes

- Every label appears in the language you pass. The only wording the renderer supplies is the Yes/No pair on a `flow`, and `yes_label` / `no_label` override it
- The `image` of a `fullimage` slide must be a file inside the workspace directory
- The slide size is fixed at 16:9
- Loading an existing template (.potx and similar) is not supported
