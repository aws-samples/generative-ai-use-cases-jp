module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['cdk.out', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'i18nhelper', '@shopify'],
  rules: {
    '@typescript-eslint/no-namespace': 'off',
    // 日本語文字列を検知するルールを適用
    'i18nhelper/no-jp-string': 'warn',
    'i18nhelper/no-jp-comment': 'warn',
    // Shopify のルールを適用
    '@shopify/jsx-no-hardcoded-content': 'warn',
  },
};
