import type { Linter }        from 'eslint'

// @ts-expect-error: Invalid import
import nextjsPlugin           from '@next/eslint-plugin-next'
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin'
import parser                 from '@typescript-eslint/parser'
// @ts-expect-error: Invalid import
import jsxA11yPlugin          from 'eslint-plugin-jsx-a11y'
import nodePlugin             from 'eslint-plugin-n'
import reactPlugin            from 'eslint-plugin-react'
// @ts-expect-error: Invalid import
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
      'eslint-plugin-react-hooks': reactHooksPlugin,
      // @ts-expect-error: Invalid types
      '@typescript-eslint': typescriptEslintPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextjsPlugin,
      'jsx-a11y': jsxA11yPlugin,
      n: nodePlugin,
      security: securityPlugin,
      // @ts-expect-error: Invalid types
      react: reactPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    settings: {
      react: {
        pragma: 'React',
        version: '18',
      },
      propWrapperFunctions: ['forbidExtraProps', 'exact', 'Object.freeze'],
    },
    languageOptions: {
      ecmaVersion: 2021,
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
        ecmaVersion: 2020,
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
    },
  },
]

export default config
