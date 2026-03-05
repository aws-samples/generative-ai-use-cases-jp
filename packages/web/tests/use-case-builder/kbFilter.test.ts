import { describe, expect, test } from 'vitest';
import {
  validateKBFilter,
  getItemsFromPlaceholders,
} from '../../src/utils/UseCaseBuilderUtils';

describe('validateKBFilter', () => {
  // Valid filters
  test('undefined is valid', () => {
    expect(validateKBFilter(undefined)).toEqual({ valid: true });
  });

  test('empty string is valid', () => {
    expect(validateKBFilter('')).toEqual({ valid: true });
  });

  test('whitespace only is valid', () => {
    expect(validateKBFilter('   ')).toEqual({ valid: true });
  });

  test('equals operator', () => {
    expect(validateKBFilter('category=AWS')).toEqual({ valid: true });
  });

  test('notEquals operator', () => {
    expect(validateKBFilter('status!=archived')).toEqual({ valid: true });
  });

  test('greaterThan operator', () => {
    expect(validateKBFilter('year>2020')).toEqual({ valid: true });
  });

  test('lessThan operator', () => {
    expect(validateKBFilter('price<100')).toEqual({ valid: true });
  });

  test('greaterThanOrEquals operator', () => {
    expect(validateKBFilter('score>=80')).toEqual({ valid: true });
  });

  test('lessThanOrEquals operator', () => {
    expect(validateKBFilter('count<=10')).toEqual({ valid: true });
  });

  test('stringContains operator', () => {
    expect(validateKBFilter('title~=AWS')).toEqual({ valid: true });
  });

  test('startsWith operator', () => {
    expect(validateKBFilter('name^=Amazon')).toEqual({ valid: true });
  });

  test('in operator (pipe-separated)', () => {
    expect(validateKBFilter('tag@AWS|Bedrock')).toEqual({ valid: true });
  });

  test('notIn operator', () => {
    expect(validateKBFilter('status!@draft|deleted')).toEqual({ valid: true });
  });

  test('in operator (single value)', () => {
    expect(validateKBFilter('tag@AWS')).toEqual({ valid: true });
  });

  test('multiple conditions (comma-separated)', () => {
    expect(validateKBFilter('category=AWS,year>2020')).toEqual({ valid: true });
  });

  test('three or more conditions', () => {
    expect(validateKBFilter('category=AWS,year>2020,tag@Bedrock|Lambda')).toEqual({
      valid: true,
    });
  });

  // Invalid filters
  test('no operator is invalid', () => {
    const result = validateKBFilter('invalidcondition');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalidcondition');
  });

  test('empty key is invalid', () => {
    const result = validateKBFilter('=value');
    expect(result.valid).toBe(false);
  });

  test('empty value is invalid', () => {
    const result = validateKBFilter('key=');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty value');
  });

  test('empty condition (consecutive commas) is invalid', () => {
    const result = validateKBFilter('category=AWS,,year>2020');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty condition');
  });
});

describe('retrieveKnowledgeBase filter option parsing', () => {
  test('no filter: label only', () => {
    expect(getItemsFromPlaceholders(['{{retrieveKnowledgeBase:query}}'])).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'query',
      },
    ]);
  });

  test('with filter: label + filter', () => {
    expect(
      getItemsFromPlaceholders(['{{retrieveKnowledgeBase:query:category=AWS}}'])
    ).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'query',
        options: 'category=AWS',
      },
    ]);
  });

  test('multiple condition filter', () => {
    expect(
      getItemsFromPlaceholders([
        '{{retrieveKnowledgeBase:query:category=AWS,year>2020}}',
      ])
    ).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'query',
        options: 'category=AWS,year>2020',
      },
    ]);
  });

  test('no label', () => {
    expect(
      getItemsFromPlaceholders(['{{retrieveKnowledgeBase}}'])
    ).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'NOLABEL',
      },
    ]);
  });

  test('filter containing colon is parsed correctly', () => {
    // Case where filter part contains a colon
    expect(
      getItemsFromPlaceholders([
        '{{retrieveKnowledgeBase:query:key=val:extra}}',
      ])
    ).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'query',
        options: 'key=val:extra',
      },
    ]);
  });
});
