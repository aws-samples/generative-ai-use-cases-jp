// ラベルが付与されていないことを識別するための特殊文字
// 空文字だと DynamoDB に inputExample を挿入した際にエラーになる
export const NOLABEL = 'NOLABEL';

const SUPPORTED_TYPES: string[] = ['text'];

export const extractPlaceholdersFromPromptTemplate = (
  promptTemplate: string
): string[] => {
  return promptTemplate.match(/\{\{[^}]*\}\}/g) ?? [];
};

export const getItemsFromPlaceholders = (placeholders: string[]) => {
  return (
    placeholders
      .map((match) => {
        const [inputType, ...labels] = match
          .replace(/^\{\{|\}\}$/g, '')
          .split(':');

        // 現状は : を含んだラベルを許容している
        // この仕様はオプション等の追加に伴い変更される可能性あり
        const label = labels.join(':');

        return {
          inputType,
          label: label.length > 0 ? label : NOLABEL,
        };
      })
      .filter((item) => SUPPORTED_TYPES.includes(item.inputType))
      .filter(
        (elem, idx, self) =>
          self.findIndex((e) => e.label === elem.label) === idx
      ) ?? []
  );
};
