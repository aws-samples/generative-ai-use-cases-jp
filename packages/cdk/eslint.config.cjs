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
        ...globals.node,
      },
    },
    rules: {
      ...typescriptConfig.rules,
      '@typescript-eslint/no-namespace': 'off',
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
