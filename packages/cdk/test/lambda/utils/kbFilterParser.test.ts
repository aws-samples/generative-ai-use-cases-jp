import {
  parseSimpleFilter,
  buildFilter,
  aggregateFilters,
} from '../../../lambda/utils/kbFilterParser';
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime';

describe('parseSimpleFilter', () => {
  // 空・未定義の入力
  test('空文字列は空配列を返す', () => {
    expect(parseSimpleFilter('')).toEqual([]);
  });

  test('空白のみの文字列は空配列を返す', () => {
    expect(parseSimpleFilter('   ')).toEqual([]);
  });

  // equals演算子
  test('equals: 文字列値', () => {
    const result = parseSimpleFilter('category=AWS');
    expect(result).toEqual([
      { equals: { key: 'category', value: 'AWS' } },
    ]);
  });

  test('equals: 数値は自動変換', () => {
    const result = parseSimpleFilter('year=2024');
    expect(result).toEqual([
      { equals: { key: 'year', value: 2024 } },
    ]);
  });

  test('equals: 真偽値trueは自動変換', () => {
    const result = parseSimpleFilter('active=true');
    expect(result).toEqual([
      { equals: { key: 'active', value: true } },
    ]);
  });

  test('equals: 真偽値falseは自動変換', () => {
    const result = parseSimpleFilter('deleted=false');
    expect(result).toEqual([
      { equals: { key: 'deleted', value: false } },
    ]);
  });

  // notEquals演算子
  test('notEquals: 文字列値', () => {
    const result = parseSimpleFilter('status!=archived');
    expect(result).toEqual([
      { notEquals: { key: 'status', value: 'archived' } },
    ]);
  });

  // 数値比較演算子
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

  // 文字列演算子
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

  // in/notIn演算子
  test('in: パイプ区切りの複数値', () => {
    const result = parseSimpleFilter('tag@AWS|Bedrock|Lambda');
    expect(result).toEqual([
      { in: { key: 'tag', value: ['AWS', 'Bedrock', 'Lambda'] } },
    ]);
  });

  test('notIn: パイプ区切りの複数値', () => {
    const result = parseSimpleFilter('status!@draft|deleted');
    expect(result).toEqual([
      { notIn: { key: 'status', value: ['draft', 'deleted'] } },
    ]);
  });

  test('in: 単一値も許容', () => {
    const result = parseSimpleFilter('tag@AWS');
    expect(result).toEqual([
      { in: { key: 'tag', value: ['AWS'] } },
    ]);
  });

  // 複数条件
  test('カンマ区切りの複数条件', () => {
    const result = parseSimpleFilter('category=AWS,year>2020');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ equals: { key: 'category', value: 'AWS' } });
    expect(result[1]).toEqual({ greaterThan: { key: 'year', value: 2020 } });
  });

  test('3つ以上の条件', () => {
    const result = parseSimpleFilter('category=AWS,year>2020,tag@Bedrock|Lambda');
    expect(result).toHaveLength(3);
  });

  // エラーケース
  test('演算子なしの条件はエラー', () => {
    expect(() => parseSimpleFilter('invalidcondition')).toThrow(
      "Invalid condition: 'invalidcondition'"
    );
  });

  test('空のキーはエラー', () => {
    expect(() => parseSimpleFilter('=value')).toThrow();
  });

  test('空の値はエラー', () => {
    expect(() => parseSimpleFilter('key=')).toThrow(
      "Empty value in condition: 'key='"
    );
  });

  test('空の条件（カンマ連続）はエラー', () => {
    expect(() => parseSimpleFilter('category=AWS,,year>2020')).toThrow(
      'Empty condition found'
    );
  });

  test('数値演算子に非数値はエラー', () => {
    expect(() => parseSimpleFilter('year>abc')).toThrow(
      "Invalid value type: 'abc' is not a number"
    );
  });
});

describe('buildFilter', () => {
  test('equals: 文字列', () => {
    expect(buildFilter('key', 'value', 'equals')).toEqual({
      equals: { key: 'key', value: 'value' },
    });
  });

  test('equals: 数値自動変換', () => {
    expect(buildFilter('year', '2024', 'equals')).toEqual({
      equals: { key: 'year', value: 2024 },
    });
  });

  test('in: パイプ区切り', () => {
    expect(buildFilter('tag', 'a|b|c', 'in')).toEqual({
      in: { key: 'tag', value: ['a', 'b', 'c'] },
    });
  });

  test('greaterThan: 数値', () => {
    expect(buildFilter('score', '90', 'greaterThan')).toEqual({
      greaterThan: { key: 'score', value: 90 },
    });
  });

  test('greaterThan: 非数値はエラー', () => {
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

  test('全て空の場合はundefined', () => {
    expect(aggregateFilters([], [], [])).toBeUndefined();
  });

  test('単一の空配列はundefined', () => {
    expect(aggregateFilters([])).toBeUndefined();
  });

  test('フィルタが1つの場合はそのまま返す', () => {
    expect(aggregateFilters([filterA])).toEqual(filterA);
  });

  test('フィルタが1つ（複数の空配列と混在）の場合はそのまま返す', () => {
    expect(aggregateFilters([], [filterA], [])).toEqual(filterA);
  });

  test('フィルタが2つ以上の場合はandAllで結合', () => {
    expect(aggregateFilters([filterA], [filterB])).toEqual({
      andAll: [filterA, filterB],
    });
  });

  test('3つのフィルタ配列を結合', () => {
    expect(aggregateFilters([filterA], [filterB], [filterC])).toEqual({
      andAll: [filterA, filterB, filterC],
    });
  });

  test('1つの配列に複数フィルタ', () => {
    expect(aggregateFilters([filterA, filterB])).toEqual({
      andAll: [filterA, filterB],
    });
  });

  test('結合順序はhidden → dynamic → userの順', () => {
    const result = aggregateFilters([filterA], [filterB], [filterC]);
    expect(result).toEqual({
      andAll: [filterA, filterB, filterC],
    });
  });
});

describe('parseSimpleFilter エッジケース', () => {
  // 値に演算子記号を含むケース
  // indexOf は最初の出現位置を返すため、key部分で最初にマッチした演算子が使われる
  test('値にイコール記号を含む場合（URL等）', () => {
    // "url=https://example.com" → key="url", value="https://example.com"
    // indexOf('=') は idx=3 で最初にマッチ、残りが値になる
    const result = parseSimpleFilter('url=https://example.com');
    expect(result).toEqual([
      { equals: { key: 'url', value: 'https://example.com' } },
    ]);
  });

  // 小数点を含む数値
  test('equals: 小数点を含む数値', () => {
    const result = parseSimpleFilter('price=19.99');
    expect(result).toEqual([
      { equals: { key: 'price', value: 19.99 } },
    ]);
  });

  test('greaterThan: 小数点を含む数値', () => {
    const result = parseSimpleFilter('score>3.14');
    expect(result).toEqual([
      { greaterThan: { key: 'score', value: 3.14 } },
    ]);
  });

  // 負の数値
  test('greaterThan: 負の数値', () => {
    // "temp>-10" → indexOf('>') は idx=4、value="-10"
    const result = parseSimpleFilter('temp>-10');
    expect(result).toEqual([
      { greaterThan: { key: 'temp', value: -10 } },
    ]);
  });

  // in演算子で値にスペースを含む
  test('in: 値の前後にスペース', () => {
    const result = parseSimpleFilter('tag@AWS | Bedrock | Lambda');
    expect(result).toEqual([
      { in: { key: 'tag', value: ['AWS', 'Bedrock', 'Lambda'] } },
    ]);
  });

  // キーにハイフンやアンダースコアを含む
  test('キーにハイフンを含む', () => {
    const result = parseSimpleFilter('data-type=document');
    expect(result).toEqual([
      { equals: { key: 'data-type', value: 'document' } },
    ]);
  });

  test('キーにアンダースコアを含む', () => {
    const result = parseSimpleFilter('file_type=pdf');
    expect(result).toEqual([
      { equals: { key: 'file_type', value: 'pdf' } },
    ]);
  });

  // 値にカンマを含むケース（カンマは条件区切りなので値には使えない）
  // これは仕様上の制限として認識しておくべき
  test('値にカンマを含む場合は複数条件として分割される', () => {
    // "desc=hello,world" → "desc=hello" と "world" の2条件
    // "world" は演算子がないのでエラー
    expect(() => parseSimpleFilter('desc=hello,world')).toThrow();
  });

  // equals: 真偽値の大文字小文字
  test('equals: TRUE（大文字）も真偽値に変換', () => {
    const result = parseSimpleFilter('active=TRUE');
    expect(result).toEqual([
      { equals: { key: 'active', value: true } },
    ]);
  });

  test('equals: False（先頭大文字）も真偽値に変換', () => {
    const result = parseSimpleFilter('deleted=False');
    expect(result).toEqual([
      { equals: { key: 'deleted', value: false } },
    ]);
  });

  // 条件の前後にスペース
  test('条件の前後にスペースがあっても正しくパース', () => {
    const result = parseSimpleFilter(' category=AWS , year>2020 ');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ equals: { key: 'category', value: 'AWS' } });
    expect(result[1]).toEqual({ greaterThan: { key: 'year', value: 2020 } });
  });

  // キーに>=を含む場合の演算子優先順位
  // OPERATORS配列で >= は = より先に定義されているため、正しく >= として認識される
  test('>=演算子が=より優先される', () => {
    const result = parseSimpleFilter('score>=90');
    expect(result).toEqual([
      { greaterThanOrEquals: { key: 'score', value: 90 } },
    ]);
  });

  test('<=演算子が<より優先される', () => {
    const result = parseSimpleFilter('score<=10');
    expect(result).toEqual([
      { lessThanOrEquals: { key: 'score', value: 10 } },
    ]);
  });

  test('!=演算子が=より優先される', () => {
    const result = parseSimpleFilter('status!=active');
    expect(result).toEqual([
      { notEquals: { key: 'status', value: 'active' } },
    ]);
  });

  test('!@演算子が@より優先される', () => {
    const result = parseSimpleFilter('tag!@draft|deleted');
    expect(result).toEqual([
      { notIn: { key: 'tag', value: ['draft', 'deleted'] } },
    ]);
  });

  // equals: 数値に見える文字列（先頭ゼロ）
  test('equals: 先頭ゼロの数値文字列は数値に変換される', () => {
    // Number('007') === 7
    const result = parseSimpleFilter('code=007');
    expect(result).toEqual([
      { equals: { key: 'code', value: 7 } },
    ]);
  });

  // equals: 空文字列に見える値（スペースのみ）
  // "key= " → trimされて空になるのでエラー
  test('値がスペースのみはエラー', () => {
    expect(() => parseSimpleFilter('key= ')).toThrow('Empty value');
  });
});
