import noJapaneseStrings from './rules/no-japanese-strings';

export = {
  rules: {
    'no-japanese-strings': noJapaneseStrings,
  },
  configs: {
    recommended: {
      plugins: ['no-japanese-strings'],
      rules: {
        'no-japanese-strings/no-japanese-strings': 'warn',
      },
    },
  },
};
