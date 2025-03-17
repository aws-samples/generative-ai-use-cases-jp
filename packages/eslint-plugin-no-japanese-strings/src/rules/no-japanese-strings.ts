import { Rule } from 'eslint';
import * as ESTree from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '日本語文字列を検知します',
      category: 'Possible Errors',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      noJapaneseString: '日本語文字列が検出されました: "{{value}}"',
    },
  },
  create(context) {
    // 日本語の文字コード範囲を検出する正規表現
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

    return {
      Literal(node: ESTree.Literal) {
        if (typeof node.value === 'string' && japaneseRegex.test(node.value)) {
          context.report({
            node,
            messageId: 'noJapaneseString',
            data: {
              value: node.value,
            },
          });
        }
      },
      TemplateLiteral(node: ESTree.TemplateLiteral) {
        node.quasis.forEach((quasi) => {
          if (
            quasi.value &&
            typeof quasi.value.cooked === 'string' &&
            japaneseRegex.test(quasi.value.cooked)
          ) {
            context.report({
              node: quasi,
              messageId: 'noJapaneseString',
              data: {
                value: quasi.value.cooked,
              },
            });
          }
        });
      },
    };
  },
};

export default rule;
