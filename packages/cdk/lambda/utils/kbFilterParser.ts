import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';

// Operator definitions for filter string parsing
// = : equals, != : notEquals, > : greaterThan, < : lessThan
// >= : greaterThanOrEquals, <= : lessThanOrEquals
// ~= : stringContains, ^= : startsWith
// @ : in (values separated by |), !@ : notIn
const OPERATORS = [
  { symbol: '>=', name: 'greaterThanOrEquals' },
  { symbol: '<=', name: 'lessThanOrEquals' },
  { symbol: '!=', name: 'notEquals' },
  { symbol: '~=', name: 'stringContains' },
  { symbol: '^=', name: 'startsWith' },
  { symbol: '!@', name: 'notIn' },
  { symbol: '=', name: 'equals' },
  { symbol: '>', name: 'greaterThan' },
  { symbol: '<', name: 'lessThan' },
  { symbol: '@', name: 'in' },
] as const;

type OperatorName = (typeof OPERATORS)[number]['name'];

/**
 * Build a RetrievalFilter from key, value, and operator name.
 * Uses 'as unknown as RetrievalFilter' due to complex AWS SDK union types.
 */
export const buildFilter = (
  key: string,
  valueStr: string,
  operatorName: OperatorName
): RetrievalFilter => {
  // in/notIn: values separated by |
  if (operatorName === 'in' || operatorName === 'notIn') {
    const values = valueStr.split('|').map((v) => v.trim());
    return {
      [operatorName]: { key, value: values },
    } as unknown as RetrievalFilter;
  }

  // Numeric operators: parse to number
  if (
    operatorName === 'greaterThan' ||
    operatorName === 'lessThan' ||
    operatorName === 'greaterThanOrEquals' ||
    operatorName === 'lessThanOrEquals'
  ) {
    const numValue = Number(valueStr);
    if (isNaN(numValue)) {
      throw new Error(
        `Invalid value type: '${valueStr}' is not a number for operator '${operatorName}'`
      );
    }
    return {
      [operatorName]: { key, value: numValue },
    } as unknown as RetrievalFilter;
  }

  // equals/notEquals: auto-detect number, boolean, or string
  if (operatorName === 'equals' || operatorName === 'notEquals') {
    let value: string | number | boolean = valueStr;
    const numValue = Number(valueStr);
    if (!isNaN(numValue)) {
      value = numValue;
    } else if (valueStr.toLowerCase() === 'true') {
      value = true;
    } else if (valueStr.toLowerCase() === 'false') {
      value = false;
    }
    return {
      [operatorName]: { key, value },
    } as unknown as RetrievalFilter;
  }

  // String operators (stringContains, startsWith)
  return {
    [operatorName]: { key, value: valueStr },
  } as unknown as RetrievalFilter;
};

/**
 * Parse a simple filter string into an array of RetrievalFilters.
 * @param filterStr Filter string (e.g., "category=AWS,year>2020")
 * @returns Array of RetrievalFilter
 * @throws Error if filter syntax is invalid
 *
 * Known limitations:
 * - Values cannot contain commas (,) as they conflict with condition separators
 * - Numeric-looking strings are automatically converted to numbers (e.g., "007" -> 7)
 *   Use stringContains (~=) or startsWith (^=) to preserve string values
 */
export const parseSimpleFilter = (filterStr: string): RetrievalFilter[] => {
  if (!filterStr || filterStr.trim() === '') {
    return [];
  }

  const filters: RetrievalFilter[] = [];
  const conditions = filterStr.split(',');

  for (const condition of conditions) {
    const trimmed = condition.trim();
    if (trimmed === '') {
      throw new Error('Empty condition found');
    }

    // Search for operator
    let foundOperator: (typeof OPERATORS)[number] | undefined;
    let operatorIndex = -1;

    for (const op of OPERATORS) {
      const idx = trimmed.indexOf(op.symbol);
      if (idx > 0) {
        foundOperator = op;
        operatorIndex = idx;
        break;
      }
    }

    if (!foundOperator || operatorIndex <= 0) {
      throw new Error(
        `Invalid condition: '${trimmed}'. Expected format: key=value`
      );
    }

    const key = trimmed.substring(0, operatorIndex).trim();
    const valueStr = trimmed
      .substring(operatorIndex + foundOperator.symbol.length)
      .trim();

    if (key === '') {
      throw new Error(`Empty key in condition: '${trimmed}'`);
    }

    if (valueStr === '') {
      throw new Error(`Empty value in condition: '${trimmed}'`);
    }

    const filter = buildFilter(key, valueStr, foundOperator.name);
    filters.push(filter);
  }

  return filters;
};

/**
 * Aggregate multiple filter arrays into a single RetrievalFilter for the Retrieve API.
 * - 0 filters: undefined
 * - 1 filter: returned as-is
 * - 2+ filters: combined with andAll
 */
export const aggregateFilters = (
  ...filterArrays: RetrievalFilter[][]
): RetrievalFilter | undefined => {
  const aggregated = filterArrays.flat().filter((f) => f != null);

  if (aggregated.length === 0) {
    return undefined;
  } else if (aggregated.length === 1) {
    return aggregated[0];
  } else {
    return { andAll: aggregated };
  }
};
