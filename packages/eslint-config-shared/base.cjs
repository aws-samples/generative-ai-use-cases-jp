const js = require('@eslint/js');
const globals = require('globals');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const i18nhelperPlugin = require('eslint-plugin-i18nhelper');

const baseConfig = js.configs.recommended;

const typescriptConfig = {
  plugins: {
    '@typescript-eslint': typescriptPlugin,
    i18nhelper: i18nhelperPlugin,
  },
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    globals: {
      ...globals.es2020,
      React: 'readonly',
      JSX: 'readonly',
      NodeJS: 'readonly',
      SignaturePad: 'readonly',
    },
  },
  rules: {
    ...typescriptPlugin.configs['eslint-recommended'].rules,
    ...typescriptPlugin.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': 'off',
    'i18nhelper/no-jp-string': 'warn',
  },
};

const commonIgnores = {
  ignores: [
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/*.config.js',
    '**/*.config.cjs',
    '**/*.config.mjs',
    '**/*.config.ts',
    '.github',
  ],
};

module.exports = {
  baseConfig,
  typescriptConfig,
  commonIgnores,
  globals,
};
