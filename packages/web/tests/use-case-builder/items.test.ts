import { describe, expect, test } from 'vitest';
import {
  getItemsFromPlaceholders,
  getTextFormItemsFromItems,
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

  test('retrieveKendra', () => {
    expect(getItemsFromPlaceholders(['{{retrieveKendra:xxx}}'])).toEqual([
      {
        inputType: 'retrieveKendra',
        label: 'xxx',
      },
    ]);
  });

  test('retrieveKnowledgeBase', () => {
    expect(getItemsFromPlaceholders(['{{retrieveKnowledgeBase:xxx}}'])).toEqual(
      [
        {
          inputType: 'retrieveKnowledgeBase',
          label: 'xxx',
        },
      ]
    );
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

  test('異なる入力タイプで同じラベルの時正しくパースできる', () => {
    expect(
      getItemsFromPlaceholders([
        '{{text}}',
        '{{retrieveKendra}}',
        '{{retrieveKnowledgeBase}}',
        '{{text:xxx}}',
        '{{retrieveKendra:xxx}}',
        '{{retrieveKnowledgeBase:xxx}}',
      ])
    ).toEqual([
      {
        inputType: 'text',
        label: NOLABEL,
      },
      {
        inputType: 'retrieveKendra',
        label: NOLABEL,
      },
      {
        inputType: 'retrieveKnowledgeBase',
        label: NOLABEL,
      },
      {
        inputType: 'text',
        label: 'xxx',
      },
      {
        inputType: 'retrieveKendra',
        label: 'xxx',
      },
      {
        inputType: 'retrieveKnowledgeBase',
        label: 'xxx',
      },
    ]);
  });

  test('TEXT_FORM_TYPES だけを正しく抽出できる', () => {
    expect(
      getTextFormItemsFromItems([
        {
          inputType: 'text',
          label: NOLABEL,
        },
        {
          inputType: 'text',
          label: 'xxx',
        },
        {
          inputType: 'retrieveKendra',
          label: NOLABEL,
        },
        {
          inputType: 'retrieveKendra',
          label: 'xxx',
        },
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
    ]);
  });
});
