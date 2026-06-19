import type { RaijinRuntimeManifest }            from './interfaces.js'

import { createHash }                            from 'node:crypto'

import { InvalidRaijinRuntimeManifestException } from './exceptions/invalid-manifest.exception.js'

export type { RaijinRuntimeManifest } from './interfaces.js'

export const RAIJIN_RUNTIME_MANIFEST_URL =
  'https://raw.githubusercontent.com/atls/raijin/master/.yarn/releases/raijin-runtime.json'
export const RAIJIN_RUNTIME_PACKAGE_NAME = '@atls/yarn-cli'
export const RAIJIN_RUNTIME_ASSET_NAME = 'yarn.mjs'
export const RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION = 1

const SHA256_PATTERN = /^[a-f0-9]{64}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const assertManifestString = (
  manifest: Record<string, unknown>,
  key: keyof RaijinRuntimeManifest
): string => {
  const value = manifest[key]

  if (typeof value !== 'string' || value.length === 0) {
    throw InvalidRaijinRuntimeManifestException.missingField(key)
  }

  return value
}

export const parseRaijinRuntimeManifest = (value: unknown): RaijinRuntimeManifest => {
  if (!isRecord(value)) {
    throw InvalidRaijinRuntimeManifestException.expectedObject()
  }

  if (value.schemaVersion !== RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION) {
    throw InvalidRaijinRuntimeManifestException.unsupportedSchemaVersion()
  }

  const packageName = assertManifestString(value, 'packageName')
  const assetName = assertManifestString(value, 'assetName')
  const sha256 = assertManifestString(value, 'sha256')

  if (packageName !== RAIJIN_RUNTIME_PACKAGE_NAME) {
    throw InvalidRaijinRuntimeManifestException.unexpectedPackage(RAIJIN_RUNTIME_PACKAGE_NAME)
  }

  if (assetName !== RAIJIN_RUNTIME_ASSET_NAME) {
    throw InvalidRaijinRuntimeManifestException.unexpectedAsset(RAIJIN_RUNTIME_ASSET_NAME)
  }

  if (!SHA256_PATTERN.test(sha256)) {
    throw InvalidRaijinRuntimeManifestException.invalidSha256()
  }

  return {
    assetName,
    assetUrl: assertManifestString(value, 'assetUrl'),
    packageName,
    schemaVersion: RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION,
    sha256,
    tagName: assertManifestString(value, 'tagName'),
    version: assertManifestString(value, 'version'),
  }
}

export const createSha256Digest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex')

export const getRaijinRuntimeYarnPath = (manifest: RaijinRuntimeManifest): string =>
  `.yarn/releases/raijin-yarn-${manifest.version}.mjs`
