import assert                         from 'node:assert/strict'
import { test }                       from 'node:test'

import { getFileFormatByPackageType } from './loader.format.js'

test('should resolve TypeScript format from ESM package boundary', () => {
  assert.equal(getFileFormatByPackageType('.ts', 'module'), 'module')
  assert.equal(getFileFormatByPackageType('.tsx', 'module'), 'module')
  assert.equal(getFileFormatByPackageType('.mts'), 'module')
})

test('should reject TypeScript without ESM package boundary', () => {
  assert.throws(() => getFileFormatByPackageType('.ts'), /supports only ESM TypeScript sources/)
})

test('should reject TypeScript from CommonJS package boundary', () => {
  assert.throws(
    () => getFileFormatByPackageType('.ts', 'commonjs'),
    /supports only ESM TypeScript sources/
  )
})

test('should ignore non-TypeScript extensions', () => {
  assert.equal(getFileFormatByPackageType('.js', 'commonjs'), null)
})
