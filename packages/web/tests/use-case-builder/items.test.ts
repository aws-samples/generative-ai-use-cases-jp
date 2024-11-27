import { describe, expect, test } from 'vitest';
import {
  getItemsFromPlaceholders,
  NOLABEL,
} from '../../src/utils/UseCaseBuilderUtils';

describe('入力タイプを正しくパースできる', () => {
  test('text', () => {
    expect(getItemsFromPlaceholders(['{{text:xxx}}'])).toEqual([
      {
        inputType: 'text',
        label: 'xxx',
      },
    ]);
  });

  test('不正なタイプ', () => {
    expect(getItemsFromPlaceholders(['{{hoge:xxx}}'])).toEqual([]);

    expect(getItemsFromPlaceholders(['{{hoge}}'])).toEqual([]);
  });
});

describe('単一のラベルを正しくパースできる', () => {
  test('無ラベル', () => {
    expect(getItemsFromPlaceholders(['{{text}}'])).toEqual([
      {
        inputType: 'text',
        label: NOLABEL,
      },
    ]);
  });

  test('{} が含まれる', () => {
    expect(getItemsFromPlaceholders(['{{text:x{x}x}}'])).toEqual([
      {
        inputType: 'text',
        label: 'x{x}x',
      },
    ]);
  });

  // これは将来的に仕様が変更される可能性あり
  test(': が含まれる', () => {
    expect(getItemsFromPlaceholders(['{{text:x:x:x}}'])).toEqual([
      {
        inputType: 'text',
        label: 'x:x:x',
      },
    ]);
  });

  test('スペースが含まれる', () => {
    expect(getItemsFromPlaceholders(['{{text: xxx }}'])).toEqual([
      {
        inputType: 'text',
        label: ' xxx ',
      },
    ]);
  });
});

describe('複数のラベルを正しくパースできる', () => {
  test('無ラベルが重複している', () => {
    expect(getItemsFromPlaceholders(['{{text}}', '{{text}}'])).toEqual([
      {
        inputType: 'text',
        label: NOLABEL,
      },
    ]);
  });

  test('有ラベルが重複している', () => {
    expect(getItemsFromPlaceholders(['{{text:xxx}}', '{{text:xxx}}'])).toEqual([
      {
        inputType: 'text',
        label: 'xxx',
      },
    ]);
  });

  test('無・有ラベルが混在している', () => {
    expect(
      getItemsFromPlaceholders([
        '{{text}}',
        '{{text}}',
        '{{text:xxx}}',
        '{{text:xxx}}',
        '{{text:yyy}}',
        '{{text:yyy}}',
      ])
    ).toEqual([
      {
        inputType: 'text',
        label: NOLABEL,
      },
      {
        inputType: 'text',
        label: 'xxx',
      },
      {
        inputType: 'text',
        label: 'yyy',
      },
    ]);
  });
});
