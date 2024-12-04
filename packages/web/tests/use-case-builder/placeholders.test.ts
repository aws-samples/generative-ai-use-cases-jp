import { describe, expect, test } from 'vitest';
import { extractPlaceholdersFromPromptTemplate } from '../../src/utils/UseCaseBuilderUtils';

describe('単一の placeholder を正しく抽出できる', () => {
  test('無ラベル', () => {
    expect(extractPlaceholdersFromPromptTemplate('{{text}}')).toEqual([
      '{{text}}',
    ]);

    expect(extractPlaceholdersFromPromptTemplate('hoge {{text}} hoge')).toEqual(
      ['{{text}}']
    );

    expect(
      extractPlaceholdersFromPromptTemplate(`hoge
fuga {{text}} fuga
hoge`)
    ).toEqual(['{{text}}']);
  });

  test('有ラベル', () => {
    expect(extractPlaceholdersFromPromptTemplate('{{text:xxx}}')).toEqual([
      '{{text:xxx}}',
    ]);

    expect(
      extractPlaceholdersFromPromptTemplate('hoge {{text:xxx}} hoge')
    ).toEqual(['{{text:xxx}}']);

    expect(
      extractPlaceholdersFromPromptTemplate(`hoge
fuga {{text:xxx}} fuga
hoge`)
    ).toEqual(['{{text:xxx}}']);
  });
});

describe('複数の placeholder を正しく抽出できる', () => {
  test('無ラベル', () => {
    expect(extractPlaceholdersFromPromptTemplate('{{text}} {{text}}')).toEqual([
      '{{text}}',
      '{{text}}',
    ]);

    expect(
      extractPlaceholdersFromPromptTemplate(`{{text}}
{{text}}`)
    ).toEqual(['{{text}}', '{{text}}']);

    expect(
      extractPlaceholdersFromPromptTemplate(`hoge {{text}} hoge
hoge {{text}} hoge`)
    ).toEqual(['{{text}}', '{{text}}']);
  });

  test('有ラベル', () => {
    expect(
      extractPlaceholdersFromPromptTemplate('{{text:xxx}} {{text:xxx}}')
    ).toEqual(['{{text:xxx}}', '{{text:xxx}}']);

    expect(
      extractPlaceholdersFromPromptTemplate(`{{text:xxx}}
{{text:xxx}}`)
    ).toEqual(['{{text:xxx}}', '{{text:xxx}}']);

    expect(
      extractPlaceholdersFromPromptTemplate(`hoge {{text:xxx}} hoge
hoge {{text:xxx}} hoge`)
    ).toEqual(['{{text:xxx}}', '{{text:xxx}}']);
  });

  test('複合', () => {
    expect(
      extractPlaceholdersFromPromptTemplate('{{text}} {{text:xxx}}')
    ).toEqual(['{{text}}', '{{text:xxx}}']);

    expect(
      extractPlaceholdersFromPromptTemplate(`{{text}}
{{text:xxx}}`)
    ).toEqual(['{{text}}', '{{text:xxx}}']);

    expect(
      extractPlaceholdersFromPromptTemplate(`hoge {{text}} hoge
hoge {{text:xxx}} hoge`)
    ).toEqual(['{{text}}', '{{text:xxx}}']);
  });
});
