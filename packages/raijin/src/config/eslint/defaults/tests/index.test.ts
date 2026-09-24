import type { ParserOptions } from '@typescript-eslint/parser'

import assert                 from 'node:assert/strict'
import { test }               from 'node:test'

import { ESLint }             from '../../../../runtime/eslint.js'
import eslintconfig           from '../index.js'

test('should preserve project-backed programs across repeated typed linting', () => {
  const [baseConfig] = eslintconfig
  const parserOptions = baseConfig.languageOptions?.parserOptions as ParserOptions | undefined

  assert.equal(parserOptions?.disallowAutomaticSingleRunInference, true)
})

test('should allow generated project config files outside tsconfig scope', () => {
  const [baseConfig] = eslintconfig
  const parserOptions = baseConfig.languageOptions?.parserOptions as ParserOptions | undefined
  const projectService = parserOptions?.projectService

  assert.ok(projectService && typeof projectService === 'object')

  assert.deepEqual(projectService.allowDefaultProject, [
    'scripts/raijin/*.js',
    'scripts/raijin/cli-surface/*.js',
    '.eslintrc.js',
    '.prettierrc.js',
    '.prettierrc.mjs',
    'eslint.config.mjs',
    'postcss.config.mjs',
  ])
})

test('should lint nested Next.js config files without typed project matching', () => {
  const nextConfig = eslintconfig.find(
    (config) => Array.isArray(config.files) && config.files.includes('**/next.config.{js,mjs}')
  )

  if (!nextConfig) {
    assert.fail('Expected Next.js config override')
  }

  assert.deepEqual(nextConfig.languageOptions?.parserOptions, {
    project: false,
    projectService: false,
  })
  assert.ok(nextConfig.rules)
  assert.equal(nextConfig.rules['@typescript-eslint/no-require-imports'], 'off')
  assert.equal(nextConfig.rules['@typescript-eslint/no-var-requires'], 'off')
  assert.equal(nextConfig.rules['n/no-sync'], 'off')
})

test('should exclude nested ESLint and PostCSS configs from typed project matching', async () => {
  const eslint = new ESLint({ overrideConfigFile: true, baseConfig: eslintconfig })
  const root = await eslint.calculateConfigForFile('eslint.config.mjs')
  const nestedEslint = await eslint.calculateConfigForFile('apps/web/eslint.config.mjs')
  const nestedPostcss = await eslint.calculateConfigForFile('apps/web/postcss.config.mjs')
  const source = await eslint.calculateConfigForFile('apps/web/src/page.tsx')

  assert.ok(root)
  assert.ok(nestedEslint)
  assert.ok(nestedPostcss)
  assert.ok(source)
  assert.ok(root.languageOptions.parserOptions.projectService)
  assert.equal(nestedEslint.languageOptions.parserOptions.projectService, false)
  assert.equal(nestedPostcss.languageOptions.parserOptions.projectService, false)
  assert.ok(source.languageOptions.parserOptions.projectService)
})

test('should scope release templates to semantic-release configuration', async () => {
  const eslint = new ESLint({ overrideConfigFile: true, baseConfig: eslintconfig })
  const release = await eslint.calculateConfigForFile('.github/actions/release/release.config.js')
  const source = await eslint.calculateConfigForFile('source.js')

  assert.equal(release.rules['no-template-curly-in-string'][0], 0)
  assert.equal(release.languageOptions.parserOptions.projectService, false)
  assert.equal(source.rules['no-template-curly-in-string'][0], 2)
})

test('should disable type-aware TypeScript rules for JavaScript files', () => {
  const javascriptConfig = eslintconfig.find(
    (config) => Array.isArray(config.files) && config.files.includes('**/*.{js,mjs,cjs,jsx}')
  )

  assert.ok(javascriptConfig?.rules)
  assert.equal(javascriptConfig.rules['@typescript-eslint/consistent-type-exports'], 'off')
  assert.equal(javascriptConfig.rules['@typescript-eslint/prefer-optional-chain'], 'off')
  assert.equal(javascriptConfig.rules['@typescript-eslint/restrict-template-expressions'], 'off')
})

test('should accept stock Next.js application component style', () => {
  const [baseConfig] = eslintconfig

  assert.ok(baseConfig.rules)
  assert.deepEqual(baseConfig.rules['react/function-component-definition'], [
    'error',
    {
      namedComponents: ['function-declaration', 'arrow-function'],
      unnamedComponents: 'arrow-function',
    },
  ])
  assert.deepEqual(baseConfig.rules['react/jsx-sort-props'], [
    'error',
    {
      ignoreCase: true,
      multiline: 'last',
      reservedFirst: true,
      callbacksLast: true,
      shorthandFirst: false,
      noSortAlphabetically: true,
    },
  ])
})
