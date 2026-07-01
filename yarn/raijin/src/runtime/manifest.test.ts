import assert                                    from 'node:assert/strict'
import { test }                                  from 'node:test'

import { InvalidRaijinRuntimeManifestException } from './exceptions/invalid-manifest.js'
import { parseRaijinRuntimeManifest }            from './manifest.js'

test('should parse Raijin runtime manifest', () => {
  assert.deepEqual(
    parseRaijinRuntimeManifest({
      assetName: 'yarn.mjs',
      assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
      packageName: '@atls/raijin',
      packageManager: 'yarn@4.15.0',
      schemaVersion: 1,
      sha256: 'a'.repeat(64),
      tagName: '@atls/raijin@1.2.3',
      version: '1.2.3',
    }),
    {
      assetName: 'yarn.mjs',
      assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
      packageName: '@atls/raijin',
      packageManager: 'yarn@4.15.0',
      schemaVersion: 1,
      sha256: 'a'.repeat(64),
      tagName: '@atls/raijin@1.2.3',
      version: '1.2.3',
    }
  )
})

test('should reject Raijin runtime manifest without package manager', () => {
  assert.throws(
    () =>
      parseRaijinRuntimeManifest({
        assetName: 'yarn.mjs',
        assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
        packageName: '@atls/raijin',
        schemaVersion: 1,
        sha256: 'a'.repeat(64),
        tagName: '@atls/raijin@1.2.3',
        version: '1.2.3',
      }),
    (error) =>
      error instanceof InvalidRaijinRuntimeManifestException &&
      error.message.includes('missing packageManager')
  )
})

test('should reject non-yarn runtime manifest', () => {
  assert.throws(
    () =>
      parseRaijinRuntimeManifest({
        assetName: 'yarn.mjs',
        assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
        packageName: '@atls/not-yarn-cli',
        schemaVersion: 1,
        sha256: 'a'.repeat(64),
        tagName: '@atls/not-yarn-cli@1.2.3',
        version: '1.2.3',
      }),
    (error) =>
      error instanceof InvalidRaijinRuntimeManifestException &&
      error.message.includes('expected @atls/raijin')
  )
})
