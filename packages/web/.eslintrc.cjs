module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:tailwindcss/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'i18nhelper', '@shopify'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Prettire で実施するので ESLint の Rule は無効化
    'tailwindcss/classnames-order': ['off'],
    // x-screen h-screen を size-screen と書くという指示が出るが
    // size-screen は存在しないというバグがあるためこちらのルールは一時的に無効化する
    // https://github.com/francoismassart/eslint-plugin-tailwindcss/issues/307
    'tailwindcss/enforces-shorthand': ['off'],
    // 日本語文字列を検知するルールを適用
    'i18nhelper/no-jp-string': 'warn',
    'i18nhelper/no-jp-comment': 'warn',
    // JSX のルールを適用
    '@shopify/jsx-no-hardcoded-content': 'warn',
  },
  settings: {
    tailwindcss: {
      // 以下の Warning 対策
      // Classname 'w-' is not a Tailwind CSS class!
      // Classname 'h-' is not a Tailwind CSS class!
      whitelist: ['w-', 'h-'],
    },
  },
};
