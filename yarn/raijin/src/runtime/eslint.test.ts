import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { eslintconfig } from './eslint.js'

test('should allow generated project config files outside tsconfig scope', () => {
  const [baseConfig] = eslintconfig
  const allowDefaultProject =
    baseConfig.languageOptions?.parserOptions?.projectService?.allowDefaultProject

  assert.deepEqual(allowDefaultProject, [
    'scripts/raijin/*.mjs',
    '.eslintrc.js',
    '.prettierrc.mjs',
    'eslint.config.mjs',
  ])
})
