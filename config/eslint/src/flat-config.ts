import jsxA11y                from 'eslint-plugin-jsx-a11y'
import react                  from 'eslint-plugin-react'
import reactHooks             from 'eslint-plugin-react-hooks'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import globals                from 'globals'
import { Linter }             from 'eslint'
import { plugin as tsPlugin } from 'typescript-eslint'
import { parser as tsParser } from 'typescript-eslint'

import { eslintrc }           from './rules'

export const eslintFlatConfig: Linter.FlatConfig[] = [
  {
    rules: eslintrc,
    files: ['**'],
    plugins: {
      react,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      // @ts-ignore
      '@typescript-eslint': tsPlugin,
      'eslint-plugin-react-hooks': eslintPluginReactHooks,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    settings: {
      react: {
        pragma: 'React',
        version: '18.2.0',
      },
      propWrapperFunctions: ['forbidExtraProps', 'exact', 'Object.freeze'],
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      // @ts-ignore
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
      },
    },
  },
]
