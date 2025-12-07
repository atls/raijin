import type { Linter }        from 'eslint'

import nextjsPlugin           from '@next/eslint-plugin-next'
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin'
import parser                 from '@typescript-eslint/parser'
// @ts-expect-error: Invalid import
import jsxA11yPlugin          from 'eslint-plugin-jsx-a11y'
import nodePlugin             from 'eslint-plugin-n'
import reactPlugin            from 'eslint-plugin-react'
import reactCompilerPlugin    from 'eslint-plugin-react-compiler'
import reactHooksPlugin       from 'eslint-plugin-react-hooks'
// @ts-expect-error: Invalid import
import securityPlugin         from 'eslint-plugin-security'

import { typescript }         from './rules/index.js'
import { security }           from './rules/index.js'
import { nextjs }             from './rules/index.js'
import { react }              from './rules/index.js'
import { node }               from './rules/index.js'
import { base }               from './rules/index.js'

const config: Array<Linter.Config> = [
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    rules: {
      ...typescript,
      ...security,
      ...nextjs,
      ...react,
      ...node,
      ...base,
    },
    plugins: {
      // @ts-expect-error: Invalid types
      'eslint-plugin-react-hooks': reactHooksPlugin,
      'eslint-plugin-react-compiler': reactCompilerPlugin,
      // @ts-expect-error: Invalid types
      '@typescript-eslint': typescriptEslintPlugin,
      // @ts-expect-error: Invalid types
      'react-hooks': reactHooksPlugin,
      '@next/next': nextjsPlugin,
      'jsx-a11y': jsxA11yPlugin,
      n: nodePlugin,
      security: securityPlugin,
      react: reactPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    settings: {
      react: {
        pragma: 'React',
        version: 'detect',
      },
      propWrapperFunctions: ['forbidExtraProps', 'exact', 'Object.freeze'],
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {},
      parser,
      parserOptions: {
        projectService: true,
        ecmaFeatures: {
          jsx: true,
          generators: false,
          objectLiteralDuplicateProperties: false,
        },
        sourceType: 'module',
        ecmaVersion: 2022,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
]

export default config
