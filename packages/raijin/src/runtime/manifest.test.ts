import assert                                    from 'node:assert/strict'
import { test }                                  from 'node:test'

import { InvalidRaijinRuntimeManifestException } from './exceptions/invalid-manifest.js'
import { parseRaijinRuntimeManifest }            from './manifest.js'

const manifest = {
  assetName: 'yarn.js',
  assetUrl: 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.js',
  packageIntegrity: 'sha512-YWJjZA==',
  packageManager: 'yarn@4.14.1',
  packageName: '@atls/raijin',
  schemaVersion: 2,
  sha256: 'a'.repeat(64),
  sourceRevision: 'b'.repeat(40),
  tagName: '@atls/raijin@1.2.3',
  version: '1.2.3',
}

test('should accept an exact verified Raijin release identity', () => {
  assert.deepEqual(parseRaijinRuntimeManifest(manifest), manifest)
})

test('should reject the published legacy manifest without inventing a yarn.js asset', () => {
  assert.throws(
    () => parseRaijinRuntimeManifest({ ...manifest, schemaVersion: 1, assetName: 'yarn.mjs' }),
    (error) =>
      error instanceof InvalidRaijinRuntimeManifestException &&
      error.message.includes('unsupported schemaVersion')
  )
})

test('should reject package, tag, asset, revision and digest mismatches', () => {
  for (const invalid of [
    { packageName: '@atls/yarn-cli' },
    { tagName: '@atls/raijin@1.2.4' },
    { assetName: 'yarn.mjs' },
    { assetUrl: 'https://github.com/atls/raijin/releases/download/other/yarn.js' },
    { sourceRevision: 'unknown' },
    { packageIntegrity: 'not-an-integrity' },
    { packageManager: 'pnpm@10.0.0' },
    { sha256: 'not-a-digest' },
  ]) {
    assert.throws(
      () => parseRaijinRuntimeManifest({ ...manifest, ...invalid }),
      InvalidRaijinRuntimeManifestException
    )
  }
})
