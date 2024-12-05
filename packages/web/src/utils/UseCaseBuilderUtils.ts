// ラベルが付与されていないことを識別するための特殊文字
// 空文字だと DynamoDB に inputExample を挿入した際にエラーになる
export const NOLABEL = 'NOLABEL';

export type BuilderItem = {
  inputType: string;
  label: string;
};

export const SUPPORTED_TYPES: string[] = [
  'text',
  'retrieveKendra',
  'retrieveKnowledgeBase',
];

export const TEXT_FORM_TYPES: string[] = ['text'];

export const extractPlaceholdersFromPromptTemplate = (
  promptTemplate: string
): string[] => {
  return promptTemplate.match(/\{\{[^}]*\}\}/g) ?? [];
};

export const getItemsFromPlaceholders = (
  placeholders: string[]
): BuilderItem[] => {
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
          self.findIndex(
            (e) => e.inputType === elem.inputType && e.label === elem.label
          ) === idx
      ) ?? []
  );
};

export const getTextFormItemsFromItems = (
  items: BuilderItem[]
): BuilderItem[] => {
  return items.filter((i) => TEXT_FORM_TYPES.includes(i.inputType));
};
