// @ts-ignore
import parser       from '@typescript-eslint/parser'

import { Linter }   from 'eslint'

import rules from './rules.js'

export const eslintConfig: Linter.Config = {
  rules,
  plugins: ['react', 'jsx-a11y', 'react-hooks', '@typescript-eslint', 'eslint-plugin-react-hooks'],
  settings: {
    react: {
      pragma: 'React',
      version: '18.2.0',
    },
    propWrapperFunctions: ['forbidExtraProps', 'exact', 'Object.freeze'],
  },
  globals: {},
  // @ts-ignore
  parser,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
}
