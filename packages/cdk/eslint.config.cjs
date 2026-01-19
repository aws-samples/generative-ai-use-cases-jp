const { defineConfig } = require('eslint/config');
const {
  baseConfig,
  typescriptConfig,
  commonIgnores,
  globals,
} = require('eslint-config-shared/base');

module.exports = defineConfig([
  baseConfig,
  {
    files: ['**/*.{ts,tsx}', '../common/**/*.{ts,tsx}'],
    ...typescriptConfig,
    languageOptions: {
      ...typescriptConfig.languageOptions,
      globals: {
        ...typescriptConfig.languageOptions.globals, // 共有設定のglobalsを継承
        ...globals.node,
        awslambda: 'readonly', // AWS Lambda Response Streaming用
      },
    },
    rules: {
      ...typescriptConfig.rules,
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  // テストファイル専用の設定（Jestグローバル）
  {
    files: ['test/**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.jest, // Jestグローバル (describe, test, expect, jest, beforeEach, afterAll, etc.)
      },
    },
  },
  {
    ignores: [
      ...commonIgnores.ignores,
      'cdk.out/**',
      'cloudfront-functions/**',
      'custom-resources/**',
    ],
  },
]);
