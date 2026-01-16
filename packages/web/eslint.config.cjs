const { defineConfig } = require('eslint/config');
const globals = require('globals');
const {
  baseConfig,
  typescriptConfig,
  commonIgnores,
} = require('eslint-config-shared/base');
const { yamlConfig } = require('eslint-config-shared/yaml');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactRefreshPlugin = require('eslint-plugin-react-refresh');
const tailwindcssPlugin = require('eslint-plugin-tailwindcss');
const shopifyPlugin = require('@shopify/eslint-plugin');

module.exports = defineConfig([
  baseConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['node_modules', 'dist', 'dist-ssr', 'dev-dist'],
    plugins: {
      ...typescriptConfig.plugins,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      tailwindcss: tailwindcssPlugin,
      '@shopify': shopifyPlugin,
    },
    languageOptions: {
      ...typescriptConfig.languageOptions,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...typescriptConfig.languageOptions.globals,
        ...globals.browser,
      },
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      tailwindcss: {
        whitelist: [
          'w-',
          'h-',
          'animate-in',
          'animate-out',
          'fade-in-.*',
          'fade-out-.*',
          'zoom-in-.*',
          'zoom-out-.*',
        ],
      },
    },
    rules: {
      ...typescriptConfig.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...tailwindcssPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'tailwindcss/classnames-order': 'off',
      'tailwindcss/enforces-shorthand': 'off',
      '@shopify/jsx-no-hardcoded-content': 'warn',
    },
  },
  yamlConfig,
  commonIgnores,
]);
