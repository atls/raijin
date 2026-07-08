import assert                      from 'node:assert/strict'
import { test }                    from 'node:test'

import { getTypeScriptSpecifiers } from './resolve.utils.js'

test('should resolve ESM JavaScript specifiers to TypeScript source candidates', () => {
  assert.deepEqual(getTypeScriptSpecifiers('./source.js'), [
    './source.ts',
    './source.tsx',
    './source.js',
  ])
  assert.deepEqual(getTypeScriptSpecifiers('./source.jsx'), ['./source.tsx', './source.jsx'])
  assert.deepEqual(getTypeScriptSpecifiers('./source.mjs'), ['./source.mts', './source.mjs'])
})

test('should not resolve CommonJS specifiers to CTS source specifiers', () => {
  assert.deepEqual(getTypeScriptSpecifiers('./source.cjs'), ['./source.cjs'])
})
