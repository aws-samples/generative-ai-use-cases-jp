import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';

// フィルタ文字列パース用の演算子定義
// = : equals, != : notEquals, > : greaterThan, < : lessThan
// >= : greaterThanOrEquals, <= : lessThanOrEquals
// ~= : stringContains, ^= : startsWith
// @ : in (値は|区切り), !@ : notIn
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
 * キー、値、演算子からRetrievalFilterを構築する
 * AWS SDKの複雑なunion型のため 'as unknown as RetrievalFilter' を使用
 */
export const buildFilter = (
  key: string,
  valueStr: string,
  operatorName: OperatorName
): RetrievalFilter => {
  // in/notIn: 値は|区切り
  if (operatorName === 'in' || operatorName === 'notIn') {
    const values = valueStr.split('|').map((v) => v.trim());
    return {
      [operatorName]: { key, value: values },
    } as unknown as RetrievalFilter;
  }

  // 数値演算子: 数値にパース
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

  // equals/notEquals: 数値・真偽値・文字列を自動判定
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

  // 文字列演算子 (stringContains, startsWith)
  return {
    [operatorName]: { key, value: valueStr },
  } as unknown as RetrievalFilter;
};

/**
 * 簡易フィルタ文字列をRetrievalFilter配列にパースする
 * @param filterStr フィルタ文字列 (例: "category=AWS,year>2020")
 * @returns RetrievalFilter配列
 * @throws フィルタ構文が不正な場合にError
 *
 * 既知の制限事項:
 * - 値にカンマ(,)を含めることはできない（条件区切りと衝突するため）
 * - 数値に見える文字列は自動的に数値に変換される（例: "007" → 7）
 *   文字列として保持したい場合はstringContains(~=)やstartsWith(^=)を使用すること
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

    // 演算子を検索
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
 * 複数のフィルタ配列を集約してRetrieve API用のフィルタに結合する
 * - 0件: undefined
 * - 1件: そのまま返却
 * - 2件以上: andAllで結合
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
