// ラベルが付与されていないことを識別するための特殊文字
// 空文字だと DynamoDB に inputExample を挿入した際にエラーになる
export const NOLABEL = 'NOLABEL';

export type BuilderItem = {
  inputType: string;
  label: string;
  options?: string;
};

export const SUPPORTED_TYPES: string[] = [
  'text',
  'form',
  'retrieveKendra',
  'retrieveKnowledgeBase',
  'select',
];

export const TEXT_FORM_TYPES: string[] = ['text', 'form', 'select'];

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

        let label: string;
        let options: string | undefined = undefined;

        // 現状オプションが許可されているのは select のみ
        if (inputType === 'select') {
          if (labels.length >= 2) {
            const [tmpLabel, ...tmpOptions] = labels;
            label = tmpLabel;
            options = tmpOptions.join(':');
          } else {
            label = labels[0] ?? NOLABEL;
          }
        } else {
          if (labels.length === 0) {
            label = NOLABEL;
          } else {
            label = labels.join(':');
          }
        }

        return {
          inputType,
          label,
          options,
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

export const getTextFormUniqueLabels = (items: BuilderItem[]): string[] => {
  return getTextFormItemsFromItems(items)
    .filter((elem, idx, self) => {
      return self.findIndex((e) => e.label === elem.label) === idx;
    })
    .map((item) => item.label);
};
