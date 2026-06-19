import assert                                    from 'node:assert/strict'
import { test }                                  from 'node:test'

import { InvalidRaijinRuntimeManifestException } from './exceptions/invalid-manifest.exception.js'
import { parseRaijinRuntimeManifest }            from './manifest.js'

test('should parse Raijin runtime manifest', () => {
  assert.deepEqual(
    parseRaijinRuntimeManifest({
      assetName: 'yarn.mjs',
      assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
      packageName: '@atls/yarn-cli',
      schemaVersion: 1,
      sha256: 'a'.repeat(64),
      tagName: '@atls/yarn-cli@1.2.3',
      version: '1.2.3',
    }),
    {
      assetName: 'yarn.mjs',
      assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
      packageName: '@atls/yarn-cli',
      schemaVersion: 1,
      sha256: 'a'.repeat(64),
      tagName: '@atls/yarn-cli@1.2.3',
      version: '1.2.3',
    }
  )
})

test('should reject non-yarn runtime manifest', () => {
  assert.throws(
    () =>
      parseRaijinRuntimeManifest({
        assetName: 'yarn.mjs',
        assetUrl: 'https://github.com/atls/raijin/releases/download/yarn/yarn.mjs',
        packageName: '@atls/code-runtime',
        schemaVersion: 1,
        sha256: 'a'.repeat(64),
        tagName: '@atls/code-runtime@1.2.3',
        version: '1.2.3',
      }),
    (error) =>
      error instanceof InvalidRaijinRuntimeManifestException &&
      error.message.includes('expected @atls/yarn-cli')
  )
})
