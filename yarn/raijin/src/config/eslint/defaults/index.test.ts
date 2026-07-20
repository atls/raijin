import assert       from 'node:assert/strict'
import { test }     from 'node:test'

import eslintconfig from './index.js'

test('should allow generated project config files outside tsconfig scope', () => {
  const [baseConfig] = eslintconfig
  const allowDefaultProject =
    baseConfig.languageOptions?.parserOptions?.projectService?.allowDefaultProject

  assert.deepEqual(allowDefaultProject, [
    'scripts/raijin/*.mjs',
    'scripts/raijin/cli-surface/*.mjs',
    '.eslintrc.js',
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
