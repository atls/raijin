/* eslint-disable */
'use strict'
module.exports = {
  rules: require('./rules'),
  plugins: [
    'eslint-plugin-react',
    'eslint-plugin-jsx-a11y',
    '@typescript-eslint/eslint-plugin',
    'eslint-plugin-react-hooks',
  ],
  reportUnusedDisableDirectives: true,
  globals: {},
  settings: {
    react: {
      pragma: 'React',
      version: '17.0.2',
    },
    propWrapperFunctions: ['forbidExtraProps', 'exact', 'Object.freeze'],
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
      generators: false,
      objectLiteralDuplicateProperties: false,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
}
