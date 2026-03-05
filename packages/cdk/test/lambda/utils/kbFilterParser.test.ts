import {
  parseSimpleFilter,
  buildFilter,
  aggregateFilters,
} from '../../../lambda/utils/kbFilterParser';
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';

describe('parseSimpleFilter', () => {
  // Empty/undefined input
  test('empty string returns empty array', () => {
    expect(parseSimpleFilter('')).toEqual([]);
  });

  test('whitespace-only string returns empty array', () => {
    expect(parseSimpleFilter('   ')).toEqual([]);
  });

  // equals operator
  test('equals: string value', () => {
    const result = parseSimpleFilter('category=AWS');
    expect(result).toEqual([
      { equals: { key: 'category', value: 'AWS' } },
    ]);
  });

  test('equals: numeric auto-conversion', () => {
    const result = parseSimpleFilter('year=2024');
    expect(result).toEqual([
      { equals: { key: 'year', value: 2024 } },
    ]);
  });

  test('equals: boolean true auto-conversion', () => {
    const result = parseSimpleFilter('active=true');
    expect(result).toEqual([
      { equals: { key: 'active', value: true } },
    ]);
  });

  test('equals: boolean false auto-conversion', () => {
    const result = parseSimpleFilter('deleted=false');
    expect(result).toEqual([
      { equals: { key: 'deleted', value: false } },
    ]);
  });

  // notEquals operator
  test('notEquals: string value', () => {
    const result = parseSimpleFilter('status!=archived');
    expect(result).toEqual([
      { notEquals: { key: 'status', value: 'archived' } },
    ]);
  });

  // Numeric comparison operators
  test('greaterThan', () => {
    const result = parseSimpleFilter('year>2020');
    expect(result).toEqual([
      { greaterThan: { key: 'year', value: 2020 } },
    ]);
  });

  test('lessThan', () => {
    const result = parseSimpleFilter('price<100');
    expect(result).toEqual([
      { lessThan: { key: 'price', value: 100 } },
    ]);
  });

  test('greaterThanOrEquals', () => {
    const result = parseSimpleFilter('score>=80');
    expect(result).toEqual([
      { greaterThanOrEquals: { key: 'score', value: 80 } },
    ]);
  });

  test('lessThanOrEquals', () => {
    const result = parseSimpleFilter('count<=10');
    expect(result).toEqual([
      { lessThanOrEquals: { key: 'count', value: 10 } },
    ]);
  });

  // String operators
  test('stringContains', () => {
    const result = parseSimpleFilter('title~=AWS');
    expect(result).toEqual([
      { stringContains: { key: 'title', value: 'AWS' } },
    ]);
  });

  test('startsWith', () => {
    const result = parseSimpleFilter('name^=Amazon');
    expect(result).toEqual([
      { startsWith: { key: 'name', value: 'Amazon' } },
    ]);
  });

  // in/notIn operators
  test('in: pipe-separated multiple values', () => {
    const result = parseSimpleFilter('tag@AWS|Bedrock|Lambda');
    expect(result).toEqual([
      { in: { key: 'tag', value: ['AWS', 'Bedrock', 'Lambda'] } },
    ]);
  });

  test('notIn: pipe-separated multiple values', () => {
    const result = parseSimpleFilter('status!@draft|deleted');
    expect(result).toEqual([
      { notIn: { key: 'status', value: ['draft', 'deleted'] } },
    ]);
  });

  test('in: single value is allowed', () => {
    const result = parseSimpleFilter('tag@AWS');
    expect(result).toEqual([
      { in: { key: 'tag', value: ['AWS'] } },
    ]);
  });

  // Multiple conditions
  test('comma-separated multiple conditions', () => {
    const result = parseSimpleFilter('category=AWS,year>2020');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ equals: { key: 'category', value: 'AWS' } });
    expect(result[1]).toEqual({ greaterThan: { key: 'year', value: 2020 } });
  });

  test('three or more conditions', () => {
    const result = parseSimpleFilter('category=AWS,year>2020,tag@Bedrock|Lambda');
    expect(result).toHaveLength(3);
  });

  // Error cases
  test('condition without operator throws error', () => {
    expect(() => parseSimpleFilter('invalidcondition')).toThrow(
      "Invalid condition: 'invalidcondition'"
    );
  });

  test('empty key throws error', () => {
    expect(() => parseSimpleFilter('=value')).toThrow();
  });

  test('empty value throws error', () => {
    expect(() => parseSimpleFilter('key=')).toThrow(
      "Empty value in condition: 'key='"
    );
  });

  test('empty condition (consecutive commas) throws error', () => {
    expect(() => parseSimpleFilter('category=AWS,,year>2020')).toThrow(
      'Empty condition found'
    );
  });

  test('non-numeric value for numeric operator throws error', () => {
    expect(() => parseSimpleFilter('year>abc')).toThrow(
      "Invalid value type: 'abc' is not a number"
    );
  });
});

describe('buildFilter', () => {
  test('equals: string', () => {
    expect(buildFilter('key', 'value', 'equals')).toEqual({
      equals: { key: 'key', value: 'value' },
    });
  });

  test('equals: numeric auto-conversion', () => {
    expect(buildFilter('year', '2024', 'equals')).toEqual({
      equals: { key: 'year', value: 2024 },
    });
  });

  test('in: pipe-separated', () => {
    expect(buildFilter('tag', 'a|b|c', 'in')).toEqual({
      in: { key: 'tag', value: ['a', 'b', 'c'] },
    });
  });

  test('greaterThan: numeric', () => {
    expect(buildFilter('score', '90', 'greaterThan')).toEqual({
      greaterThan: { key: 'score', value: 90 },
    });
  });

  test('greaterThan: non-numeric throws error', () => {
    expect(() => buildFilter('score', 'abc', 'greaterThan')).toThrow();
  });

  test('stringContains', () => {
    expect(buildFilter('title', 'AWS', 'stringContains')).toEqual({
      stringContains: { key: 'title', value: 'AWS' },
    });
  });
});

describe('aggregateFilters', () => {
  const filterA = { equals: { key: 'a', value: '1' } } as unknown as RetrievalFilter;
  const filterB = { equals: { key: 'b', value: '2' } } as unknown as RetrievalFilter;
  const filterC = { greaterThan: { key: 'c', value: 3 } } as unknown as RetrievalFilter;

  test('all empty returns undefined', () => {
    expect(aggregateFilters([], [], [])).toBeUndefined();
  });

  test('single empty array returns undefined', () => {
    expect(aggregateFilters([])).toBeUndefined();
  });

  test('single filter returns as-is', () => {
    expect(aggregateFilters([filterA])).toEqual(filterA);
  });

  test('single filter mixed with empty arrays returns as-is', () => {
    expect(aggregateFilters([], [filterA], [])).toEqual(filterA);
  });

  test('two or more filters combined with andAll', () => {
    expect(aggregateFilters([filterA], [filterB])).toEqual({
      andAll: [filterA, filterB],
    });
  });

  test('three filter arrays combined', () => {
    expect(aggregateFilters([filterA], [filterB], [filterC])).toEqual({
      andAll: [filterA, filterB, filterC],
    });
  });

  test('single array with multiple filters', () => {
    expect(aggregateFilters([filterA, filterB])).toEqual({
      andAll: [filterA, filterB],
    });
  });

  test('combination order is hidden -> dynamic -> user', () => {
    const result = aggregateFilters([filterA], [filterB], [filterC]);
    expect(result).toEqual({
      andAll: [filterA, filterB, filterC],
    });
  });
});

describe('parseSimpleFilter edge cases', () => {
  // Value containing operator characters
  test('value containing equals sign (e.g., URL)', () => {
    const result = parseSimpleFilter('url=https://example.com');
    expect(result).toEqual([
      { equals: { key: 'url', value: 'https://example.com' } },
    ]);
  });

  // Decimal numbers
  test('equals: decimal number', () => {
    const result = parseSimpleFilter('price=19.99');
    expect(result).toEqual([
      { equals: { key: 'price', value: 19.99 } },
    ]);
  });

  test('greaterThan: decimal number', () => {
    const result = parseSimpleFilter('score>3.14');
    expect(result).toEqual([
      { greaterThan: { key: 'score', value: 3.14 } },
    ]);
  });

  // Negative numbers
  test('greaterThan: negative number', () => {
    const result = parseSimpleFilter('temp>-10');
    expect(result).toEqual([
      { greaterThan: { key: 'temp', value: -10 } },
    ]);
  });

  // in operator with spaces in values
  test('in: values with surrounding spaces', () => {
    const result = parseSimpleFilter('tag@AWS | Bedrock | Lambda');
    expect(result).toEqual([
      { in: { key: 'tag', value: ['AWS', 'Bedrock', 'Lambda'] } },
    ]);
  });

  // Keys with hyphens and underscores
  test('key with hyphen', () => {
    const result = parseSimpleFilter('data-type=document');
    expect(result).toEqual([
      { equals: { key: 'data-type', value: 'document' } },
    ]);
  });

  test('key with underscore', () => {
    const result = parseSimpleFilter('file_type=pdf');
    expect(result).toEqual([
      { equals: { key: 'file_type', value: 'pdf' } },
    ]);
  });

  // Value containing comma (comma is condition separator, cannot be in values)
  test('value with comma is split into multiple conditions', () => {
    expect(() => parseSimpleFilter('desc=hello,world')).toThrow();
  });

  // Boolean case sensitivity
  test('equals: TRUE (uppercase) converts to boolean', () => {
    const result = parseSimpleFilter('active=TRUE');
    expect(result).toEqual([
      { equals: { key: 'active', value: true } },
    ]);
  });

  test('equals: False (capitalized) converts to boolean', () => {
    const result = parseSimpleFilter('deleted=False');
    expect(result).toEqual([
      { equals: { key: 'deleted', value: false } },
    ]);
  });

  // Spaces around conditions
  test('conditions with surrounding spaces parse correctly', () => {
    const result = parseSimpleFilter(' category=AWS , year>2020 ');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ equals: { key: 'category', value: 'AWS' } });
    expect(result[1]).toEqual({ greaterThan: { key: 'year', value: 2020 } });
  });

  // Operator precedence
  test('>= operator takes precedence over =', () => {
    const result = parseSimpleFilter('score>=90');
    expect(result).toEqual([
      { greaterThanOrEquals: { key: 'score', value: 90 } },
    ]);
  });

  test('<= operator takes precedence over <', () => {
    const result = parseSimpleFilter('score<=10');
    expect(result).toEqual([
      { lessThanOrEquals: { key: 'score', value: 10 } },
    ]);
  });

  test('!= operator takes precedence over =', () => {
    const result = parseSimpleFilter('status!=active');
    expect(result).toEqual([
      { notEquals: { key: 'status', value: 'active' } },
    ]);
  });

  test('!@ operator takes precedence over @', () => {
    const result = parseSimpleFilter('tag!@draft|deleted');
    expect(result).toEqual([
      { notIn: { key: 'tag', value: ['draft', 'deleted'] } },
    ]);
  });

  // Leading zero numeric string
  test('equals: leading zero numeric string converts to number', () => {
    const result = parseSimpleFilter('code=007');
    expect(result).toEqual([
      { equals: { key: 'code', value: 7 } },
    ]);
  });

  // Whitespace-only value
  test('whitespace-only value throws error', () => {
    expect(() => parseSimpleFilter('key= ')).toThrow('Empty value');
  });
});
