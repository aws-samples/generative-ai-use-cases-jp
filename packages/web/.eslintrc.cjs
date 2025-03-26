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
    // Disable ESLint rules because Prettier will handle them
    'tailwindcss/classnames-order': ['off'],
    // There is a bug that x-screen h-screen is written as size-screen, but size-screen does not exist.
    // So this rule is temporarily disabled.
    // https://github.com/francoismassart/eslint-plugin-tailwindcss/issues/307
    'tailwindcss/enforces-shorthand': ['off'],
    // Detect Japanese strings
    'i18nhelper/no-jp-string': 'warn',
    'i18nhelper/no-jp-comment': 'warn',
    // Apply JSX rules
    '@shopify/jsx-no-hardcoded-content': 'warn',
  },
  settings: {
    tailwindcss: {
      // The following warnings are suppressed
      // Classname 'w-' is not a Tailwind CSS class!
      // Classname 'h-' is not a Tailwind CSS class!
      whitelist: ['w-', 'h-'],
    },
  },
};
