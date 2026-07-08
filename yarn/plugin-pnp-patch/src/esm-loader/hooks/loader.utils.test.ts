import assert                         from 'node:assert/strict'
import { test }                       from 'node:test'

import { getFileFormatByPackageType } from './loader.format.js'
import { isPnpPackageSource }         from './loader.format.js'

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

test('should resolve TypeScript format from PnP package source boundary', () => {
  const filepath =
    '/repo/.yarn/__virtual__/package-virtual/2/.yarn/berry/cache/package.zip/node_modules/package/sources/dependency.ts'

  assert.equal(isPnpPackageSource(filepath), true)
  assert.equal(getFileFormatByPackageType('.ts', undefined, isPnpPackageSource(filepath)), 'module')
})

test('should ignore non-TypeScript extensions', () => {
  assert.equal(getFileFormatByPackageType('.js', 'commonjs'), null)
})
