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
  plugins: ['react-refresh'],
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
