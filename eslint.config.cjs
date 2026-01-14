const { defineConfig } = require('eslint/config');
const { yamlConfig, commonIgnores } = require('eslint-config-shared');

// Root-level YAML files only (packages have their own ESLint configs)
module.exports = defineConfig([
  {
    ...yamlConfig,
    ignores: ['.github/**/*.{yaml,yml}', 'mkdocs.yml'],
  },
  {
    ignores: [...commonIgnores.ignores, 'packages/**'],
  },
]);
