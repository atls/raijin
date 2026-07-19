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

const typeAwareJavaScriptRules = (
  typescriptEslintPlugin as unknown as {
    configs: Record<string, { rules: Linter.RulesRecord }>
  }
).configs['flat/disable-type-checked'].rules

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
        projectService: {
          allowDefaultProject: [
            'scripts/raijin/*.mjs',
            'scripts/raijin/cli-surface/*.mjs',
            '.eslintrc.js',
            '.prettierrc.mjs',
            'eslint.config.mjs',
            'postcss.config.mjs',
          ],
        },
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
      ...typeAwareJavaScriptRules,
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['**/next.config.{js,mjs}'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'n/no-sync': 'off',
    },
  },
  {
    files: ['scripts/raijin/*.mjs'],
    rules: {
      'n/no-sync': 'off',
      'n/no-process-exit': 'off',
      'no-nested-ternary': 'off',
      'no-console': 'off',
      'security/detect-unsafe-regex': 'off',
      'no-await-in-loop': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
]

export default config
