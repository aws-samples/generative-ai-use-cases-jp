// ラベルが付与されていないことを識別するための特殊文字
// 空文字だと DynamoDB に inputExample を挿入した際にエラーになる
export const NOLABEL = 'NOLABEL';

export const extractPlaceholdersFromPromptTemplate = (
  promptTemplate: string
): string[] => {
  return promptTemplate.match(/\{\{[^}]*\}\}/g) ?? [];
};

export const getItemsFromPlaceholders = (placeholders: string[]) => {
  return (
    placeholders
      .map((match) => {
        const [inputType, label] = match.replace(/^\{\{|\}\}$/g, '').split(':');
        return {
          inputType,
          label: label ?? NOLABEL,
        };
      })
      .filter(
        (elem, idx, self) =>
          self.findIndex((e) => e.label === elem.label) === idx
      ) ?? []
  );
};
