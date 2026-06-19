import type { RaijinRuntimeManifest } from './runtime/interfaces.js'

export const RAIJIN_INITIALIZER_USAGE_MESSAGE =
  'Usage: yarn init @atls/raijin or yarn dlx @atls/raijin init'

export const INVALID_RUNTIME_MANIFEST_OBJECT_MESSAGE =
  'Invalid Raijin runtime manifest: expected object'

export const INVALID_RUNTIME_MANIFEST_SCHEMA_VERSION_MESSAGE =
  'Invalid Raijin runtime manifest: unsupported schemaVersion'

export const INVALID_RUNTIME_MANIFEST_SHA256_MESSAGE =
  'Invalid Raijin runtime manifest: invalid sha256'

export const createRuntimeManifestDownloadFailureMessage = (status: number): string =>
  `Failed to download Raijin runtime manifest: ${status}`

export const createRuntimeAssetDownloadFailureMessage = (status: number): string =>
  `Failed to download Raijin runtime asset: ${status}`

export const createInvalidRuntimeManifestFieldMessage = (
  key: keyof RaijinRuntimeManifest
): string => `Invalid Raijin runtime manifest: missing ${key}`

export const createInvalidRuntimeManifestPackageMessage = (packageName: string): string =>
  `Invalid Raijin runtime manifest: expected ${packageName}`

export const createInvalidRuntimeManifestAssetMessage = (assetName: string): string =>
  `Invalid Raijin runtime manifest: expected ${assetName}`

export const createRuntimeDigestMismatchMessage = (expected: string, actual: string): string =>
  `Downloaded Raijin runtime digest mismatch: expected ${expected}, got ${actual}`

export const createYarnCommandFailureMessage = (args: Array<string>): string =>
  `Command failed: yarn ${args.join(' ')}`
