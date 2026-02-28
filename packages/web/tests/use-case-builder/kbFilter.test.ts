import { describe, expect, test } from 'vitest';
import {
  validateKBFilter,
  getItemsFromPlaceholders,
} from '../../src/utils/UseCaseBuilderUtils';

describe('validateKBFilter', () => {
  // 有効なフィルタ
  test('undefinedは有効', () => {
    expect(validateKBFilter(undefined)).toEqual({ valid: true });
  });

  test('空文字列は有効', () => {
    expect(validateKBFilter('')).toEqual({ valid: true });
  });

  test('空白のみは有効', () => {
    expect(validateKBFilter('   ')).toEqual({ valid: true });
  });

  test('equals演算子', () => {
    expect(validateKBFilter('category=AWS')).toEqual({ valid: true });
  });

  test('notEquals演算子', () => {
    expect(validateKBFilter('status!=archived')).toEqual({ valid: true });
  });

  test('greaterThan演算子', () => {
    expect(validateKBFilter('year>2020')).toEqual({ valid: true });
  });

  test('lessThan演算子', () => {
    expect(validateKBFilter('price<100')).toEqual({ valid: true });
  });

  test('greaterThanOrEquals演算子', () => {
    expect(validateKBFilter('score>=80')).toEqual({ valid: true });
  });

  test('lessThanOrEquals演算子', () => {
    expect(validateKBFilter('count<=10')).toEqual({ valid: true });
  });

  test('stringContains演算子', () => {
    expect(validateKBFilter('title~=AWS')).toEqual({ valid: true });
  });

  test('startsWith演算子', () => {
    expect(validateKBFilter('name^=Amazon')).toEqual({ valid: true });
  });

  test('in演算子（パイプ区切り）', () => {
    expect(validateKBFilter('tag@AWS|Bedrock')).toEqual({ valid: true });
  });

  test('notIn演算子', () => {
    expect(validateKBFilter('status!@draft|deleted')).toEqual({ valid: true });
  });

  test('in演算子（単一値）', () => {
    expect(validateKBFilter('tag@AWS')).toEqual({ valid: true });
  });

  test('複数条件（カンマ区切り）', () => {
    expect(validateKBFilter('category=AWS,year>2020')).toEqual({ valid: true });
  });

  test('3つ以上の条件', () => {
    expect(validateKBFilter('category=AWS,year>2020,tag@Bedrock|Lambda')).toEqual({
      valid: true,
    });
  });

  // 無効なフィルタ
  test('演算子なしは無効', () => {
    const result = validateKBFilter('invalidcondition');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalidcondition');
  });

  test('空のキーは無効', () => {
    const result = validateKBFilter('=value');
    expect(result.valid).toBe(false);
  });

  test('空の値は無効', () => {
    const result = validateKBFilter('key=');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty value');
  });

  test('空の条件（カンマ連続）は無効', () => {
    const result = validateKBFilter('category=AWS,,year>2020');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Empty condition');
  });
});

describe('retrieveKnowledgeBase フィルタオプション解析', () => {
  test('フィルタなし: ラベルのみ', () => {
    expect(getItemsFromPlaceholders(['{{retrieveKnowledgeBase:query}}'])).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'query',
      },
    ]);
  });

  test('フィルタあり: ラベル+フィルタ', () => {
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

  test('複数条件のフィルタ', () => {
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

  test('ラベルなし', () => {
    expect(
      getItemsFromPlaceholders(['{{retrieveKnowledgeBase}}'])
    ).toEqual([
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'NOLABEL',
      },
    ]);
  });

  test('フィルタにコロンを含む場合も正しく解析', () => {
    // フィルタ部分にコロンが含まれるケース
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
