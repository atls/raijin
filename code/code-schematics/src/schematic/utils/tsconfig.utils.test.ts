import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import tsconfig                   from '@atls/raijin/typescript-config'

import { mergeTsCompilerOptions } from './tsconfig.utils.js'

test('should preserve project-specific compiler options while applying raijin defaults', () => {
  const actual = mergeTsCompilerOptions(
    {
      rootDir: '.',
      skipLibCheck: true,
      noImplicitOverride: true,
      module: 'esnext',
      moduleResolution: 'bundler',
    },
    tsconfig.compilerOptions
  )

  assert.equal((actual as Record<string, unknown>).rootDir, '.')
  assert.equal((actual as Record<string, unknown>).skipLibCheck, true)
  assert.equal((actual as Record<string, unknown>).noImplicitOverride, true)
  assert.equal((actual as Record<string, unknown>).module, 'esnext')
  assert.equal((actual as Record<string, unknown>).moduleResolution, 'bundler')
})
