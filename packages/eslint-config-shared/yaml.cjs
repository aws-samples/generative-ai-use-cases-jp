const ymlPlugin = require('eslint-plugin-yml');
const yamlParser = require('yaml-eslint-parser');

const yamlConfig = {
  files: ['**/*.{yaml,yml}'],
  plugins: {
    yml: ymlPlugin,
  },
  languageOptions: {
    parser: yamlParser,
  },
  rules: {
    ...ymlPlugin.configs.standard.rules,
    'yml/sort-keys': 'error',
    'yml/quotes': ['error', { prefer: 'single', avoidEscape: true }],
  },
};

const yamlIgnores = {
  ignores: ['mkdocs.yml'],
};

module.exports = {
  yamlConfig,
  yamlIgnores,
};
