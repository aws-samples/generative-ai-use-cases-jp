// Special character to identify when there is no label
// Empty string causes an error when inserting inputExample into DynamoDB
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

        // select and retrieveKnowledgeBase allow options
        if (inputType === 'select') {
          if (labels.length >= 2) {
            const [tmpLabel, ...tmpOptions] = labels;
            label = tmpLabel;
            options = tmpOptions.join(':');
          } else {
            label = labels[0] ?? NOLABEL;
          }
        } else if (inputType === 'retrieveKnowledgeBase') {
          // retrieveKnowledgeBase supports filter as options
          // Format: {{retrieveKnowledgeBase:label:filter}}
          // e.g., {{retrieveKnowledgeBase:query:category=AWS,year>2020}}
          if (labels.length >= 2) {
            label = labels[0];
            options = labels.slice(1).join(':'); // Filter part (may contain ':')
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

// Supported operators for Knowledge Base filter
// = : equals, != : notEquals, > : greaterThan, < : lessThan
// >= : greaterThanOrEquals, <= : lessThanOrEquals
// ~= : stringContains, ^= : startsWith
// @ : in (values separated by |), !@ : notIn
const KB_FILTER_OPERATORS = [
  '>=',
  '<=',
  '!=',
  '~=',
  '^=',
  '!@',
  '=',
  '>',
  '<',
  '@',
] as const;

export type KBFilterValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validate Knowledge Base filter syntax (frontend pre-check)
 * @param filterStr Filter string (e.g., "category=AWS,year>2020")
 * @returns Validation result. Contains error message if invalid.
 *
 * Known limitations:
 * - Values cannot contain commas (,) as they conflict with condition separators
 * - Numeric-looking strings are automatically converted to numbers on the backend (e.g., "007" -> 7)
 *   Use stringContains (~=) or startsWith (^=) to preserve string values
 */
export const validateKBFilter = (
  filterStr: string | undefined
): KBFilterValidationResult => {
  if (!filterStr || filterStr.trim() === '') {
    return { valid: true };
  }

  const conditions = filterStr.split(',');

  for (const condition of conditions) {
    const trimmed = condition.trim();
    if (trimmed === '') {
      return { valid: false, error: 'Empty condition found' };
    }

    // Find the operator
    let foundOperator: string | undefined;
    let operatorIndex = -1;

    for (const op of KB_FILTER_OPERATORS) {
      const idx = trimmed.indexOf(op);
      if (idx > 0) {
        foundOperator = op;
        operatorIndex = idx;
        break;
      }
    }

    if (!foundOperator || operatorIndex <= 0) {
      return {
        valid: false,
        error: `Invalid condition: '${trimmed}'. Expected format: key=value`,
      };
    }

    const key = trimmed.substring(0, operatorIndex).trim();
    const value = trimmed
      .substring(operatorIndex + foundOperator.length)
      .trim();

    if (key === '') {
      return { valid: false, error: `Empty key in condition: '${trimmed}'` };
    }

    if (value === '') {
      return { valid: false, error: `Empty value in condition: '${trimmed}'` };
    }

    // For @ and !@ operators, values should be separated by |
    if (
      (foundOperator === '@' || foundOperator === '!@') &&
      !value.includes('|')
    ) {
      // Single value is also allowed for in/notIn
    }
  }

  return { valid: true };
};
