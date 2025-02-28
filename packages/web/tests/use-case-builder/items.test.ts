import { describe, expect, test } from 'vitest';
import {
  getItemsFromPlaceholders,
  getTextFormItemsFromItems,
  getTextFormUniqueLabels,
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

  test('空文字ラベル', () => {
    expect(getItemsFromPlaceholders(['{{text:}}'])).toEqual([
      {
        inputType: 'text',
        label: '',
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

  test('オプションが許可されていない inputType のラベルに : が含まれる', () => {
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

describe('オプションを正しくパースできる', () => {
  test('オプション未指定', () => {
    expect(getItemsFromPlaceholders(['{{select}}'])).toEqual([
      {
        inputType: 'select',
        label: NOLABEL,
        options: undefined,
      },
    ]);

    expect(getItemsFromPlaceholders(['{{select:}}'])).toEqual([
      {
        inputType: 'select',
        label: '',
        options: undefined,
      },
    ]);

    expect(getItemsFromPlaceholders(['{{select:hoge}}'])).toEqual([
      {
        inputType: 'select',
        label: 'hoge',
        options: undefined,
      },
    ]);
  });

  test('オプション指定', () => {
    expect(getItemsFromPlaceholders(['{{select:hoge:}}'])).toEqual([
      {
        inputType: 'select',
        label: 'hoge',
        options: '',
      },
    ]);

    expect(getItemsFromPlaceholders(['{{select::hoge}}'])).toEqual([
      {
        inputType: 'select',
        label: '',
        options: 'hoge',
      },
    ]);

    expect(getItemsFromPlaceholders(['{{select:hoge:fuga,hage}}'])).toEqual([
      {
        inputType: 'select',
        label: 'hoge',
        options: 'fuga,hage',
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

  test('ユニークな label を抽出できる', () => {
    expect(
      getTextFormUniqueLabels([
        {
          inputType: 'text',
          label: NOLABEL,
        },
        {
          inputType: 'text',
          label: 'xxx',
        },
        {
          inputType: 'form',
          label: NOLABEL,
        },
        {
          inputType: 'form',
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
    ).toEqual([NOLABEL, 'xxx']);
  });
});
