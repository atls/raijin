import { createHash }                            from 'node:crypto'

import { InvalidRaijinRuntimeManifestException } from './exceptions/invalid-manifest.js'

export interface RaijinRuntimeManifest {
  assetName: string
  assetUrl: string
  packageIntegrity: string
  packageName: string
  packageManager: string
  schemaVersion: number
  sha256: string
  sourceRevision: string
  tagName: string
  version: string
}

export const RAIJIN_RUNTIME_MANIFEST_URL =
  'https://raw.githubusercontent.com/atls/raijin/master/.yarn/releases/raijin-runtime.json'
export const RAIJIN_RUNTIME_PACKAGE_NAME = '@atls/raijin'
export const RAIJIN_RUNTIME_ASSET_NAME = 'yarn.js'
export const RAIJIN_RUNTIME_YARN_PATH = '.yarn/releases/yarn.js'
export const RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION = 2

const SHA256_PATTERN = /^[a-f0-9]{64}$/
const SOURCE_REVISION_PATTERN = /^[a-f0-9]{40}$/
const PACKAGE_INTEGRITY_PATTERN = /^sha512-[A-Za-z0-9+/]+={0,2}$/
const YARN_PACKAGE_MANAGER_PATTERN = /^yarn@\d+\.\d+\.\d+$/

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
  const sourceRevision = assertManifestString(value, 'sourceRevision')
  const packageIntegrity = assertManifestString(value, 'packageIntegrity')

  if (packageName !== RAIJIN_RUNTIME_PACKAGE_NAME) {
    throw InvalidRaijinRuntimeManifestException.unexpectedPackage(RAIJIN_RUNTIME_PACKAGE_NAME)
  }

  if (assetName !== RAIJIN_RUNTIME_ASSET_NAME) {
    throw InvalidRaijinRuntimeManifestException.unexpectedAsset(RAIJIN_RUNTIME_ASSET_NAME)
  }

  if (!SHA256_PATTERN.test(sha256)) {
    throw InvalidRaijinRuntimeManifestException.invalidSha256()
  }

  if (
    !SOURCE_REVISION_PATTERN.test(sourceRevision) ||
    !PACKAGE_INTEGRITY_PATTERN.test(packageIntegrity)
  ) {
    throw InvalidRaijinRuntimeManifestException.invalidIdentity()
  }

  const assetUrl = assertManifestString(value, 'assetUrl')
  const packageManager = assertManifestString(value, 'packageManager')
  const tagName = assertManifestString(value, 'tagName')
  const version = assertManifestString(value, 'version')
  const expectedTagName = `${RAIJIN_RUNTIME_PACKAGE_NAME}@${version}`

  if (tagName !== expectedTagName) {
    throw InvalidRaijinRuntimeManifestException.unexpectedTagName(expectedTagName)
  }

  if (!YARN_PACKAGE_MANAGER_PATTERN.test(packageManager)) {
    throw InvalidRaijinRuntimeManifestException.invalidIdentity()
  }

  let releaseUrl: URL

  try {
    releaseUrl = new URL(assetUrl)
  } catch {
    throw InvalidRaijinRuntimeManifestException.unexpectedAsset(RAIJIN_RUNTIME_ASSET_NAME)
  }

  if (
    releaseUrl.origin !== 'https://github.com' ||
    decodeURIComponent(releaseUrl.pathname) !==
      `/atls/raijin/releases/download/${tagName}/${assetName}`
  ) {
    throw InvalidRaijinRuntimeManifestException.unexpectedAsset(RAIJIN_RUNTIME_ASSET_NAME)
  }

  return {
    assetName,
    assetUrl,
    packageIntegrity,
    packageName,
    packageManager,
    schemaVersion: RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION,
    sha256,
    sourceRevision,
    tagName,
    version,
  }
}

export const createSha256Digest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex')

export const getRaijinRuntimeYarnPath = (): string => RAIJIN_RUNTIME_YARN_PATH
