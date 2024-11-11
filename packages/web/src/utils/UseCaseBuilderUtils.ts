export const extractPlaceholdersFromPromptTemplate = (
  promptTemplate: string
): string[] => {
  return promptTemplate.match(/\{\{(.+)\}\}/g) ?? [];
};

export const getItemsFromPlaceholders = (placeholders: string[]) => {
  return (
    placeholders.map((match) => {
      const [inputType, label] = match.replace(/^\{\{|\}\}$/g, '').split(':');
      return {
        inputType,
        label,
      };
    }) ?? []
  );
};
