const { config: prettierConfig } = require('@atls/code-format')

module.exports = {
  extends: [
    'eslint-config-airbnb-base/rules/best-practices',
    'eslint-config-airbnb-base/rules/errors',
    'eslint-config-airbnb-base/rules/node',
    'eslint-config-airbnb-base/rules/style',
    'eslint-config-airbnb-base/rules/variables',
    'eslint-config-airbnb-base/rules/es6',
    'eslint-config-airbnb-base/rules/strict',
    'eslint-config-airbnb-base/rules/imports',
    'eslint-config-airbnb/rules/react',
    'eslint-config-airbnb/rules/react-a11y',
    'eslint-config-airbnb/rules/react-hooks',
    './typescript',
    'eslint-config-prettier',
  ].map(require.resolve),
  plugins: ['prettier'],
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  rules: {
    'prettier/prettier': ['error', prettierConfig],

    'class-methods-use-this': 0,

    'import/no-cycle': 0,
    'import/no-duplicates': 0,
    'import/no-unresolved': 0,
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],

    'jsx-a11y/html-has-lang': 0,

    'react/jsx-props-no-spreading': 0,
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx', '.tsx'] }],
    'react/prop-types': 0,
    'react/no-danger': 0,

    '@typescript-eslint/semi': 0,
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],

    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',

    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'error',

    '@typescript-eslint/indent': 0,

    'no-shadow': ['error', { allow: ['ClientFactory', 'ServerBuilder'] }],
  },
  settings: {
    react: {
      pragma: 'React',
      version: '17.0.2',
    },
  },
}
