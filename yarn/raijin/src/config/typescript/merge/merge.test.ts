import assert                             from 'node:assert/strict'
import test                               from 'node:test'

import { applyTypeScriptCompilerOptions } from './merge.js'

test('should preserve project compiler options while applying defaults', () => {
  const config = applyTypeScriptCompilerOptions(
    { compilerOptions: { module: 'esnext', moduleResolution: 'bundler' } },
    { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true }
  )

  assert.deepEqual(config.compilerOptions, {
    module: 'esnext',
    moduleResolution: 'bundler',
    strict: true,
  })
})
