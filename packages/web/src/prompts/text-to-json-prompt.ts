export default {
  systemPrompt: (context: string, format: Record<string, string>) => `${context}
出力は、必ずJSON形式で行ってください。それ以外の文言は一切出力してはいけません。例外はありません。
出力のJSONは、以下の出力形式としてください。項目の追加と削除は絶対にしないでください。
適切な情報が設定できない項目については、値に「N/A」を設定してください。

# 出力形式
${JSON.stringify(format)}
`,
  parseErrorRetryPrompt: (
    format: Record<string, string>
  ) => `JSON形式で出力されていません。必ず以下の出力形式のJSONで出力してください。
JSON以外の文字列は一切出力しないでください。例外はありません。

# 出力形式
${JSON.stringify(format)}
`,
  keysInvalidErrorRetryPrompt: (
    format: Record<string, string>
  ) => `出力されたJSONのフォーマットが異なります。必ず以下の出力形式のJSONで出力してください。
必ず出力形式通りに出力してください。項目の追加と削除も絶対にしてはいけません。例外はありません。
適切な情報が設定できない項目については、項目を削除せずに値に「N/A」を設定してください。
なお、JSON以外の文字列は一切出力しないでください。例外はありません。

# 出力形式
${JSON.stringify(format)}
`,
};
