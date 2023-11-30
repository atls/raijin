import typescriptEslint       from '@typescript-eslint/eslint-plugin'
import parser                 from '@typescript-eslint/parser'

import jsxA11y                from 'eslint-plugin-jsx-a11y'
import react                  from 'eslint-plugin-react'
import reactHooks             from 'eslint-plugin-react-hooks'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'

import eslintrc               from './rules'

export default [
  {
    rules: eslintrc,
    plugins: {
      react,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      '@typescript-eslint': typescriptEslint,
      'eslint-plugin-react-hooks': eslintPluginReactHooks,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    settings: {
      react: {
        pragma: 'React',
        version: '17.0.2',
      },
      propWrapperFunctions: ['forbidExtraProps', 'exact', 'Object.freeze'],
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {},
      parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
          generators: false,
          objectLiteralDuplicateProperties: false,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  },
]
