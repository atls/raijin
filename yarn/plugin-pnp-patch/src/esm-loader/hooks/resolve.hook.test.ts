import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import { getTypeScriptSpecifier } from './resolve.utils.js'

test('should resolve ESM JavaScript specifiers to TypeScript source specifiers', () => {
  assert.equal(getTypeScriptSpecifier('./source.js'), './source.ts')
  assert.equal(getTypeScriptSpecifier('./source.jsx'), './source.tsx')
  assert.equal(getTypeScriptSpecifier('./source.mjs'), './source.mts')
})

test('should not resolve CommonJS specifiers to CTS source specifiers', () => {
  assert.equal(getTypeScriptSpecifier('./source.cjs'), './source.cjs')
})
