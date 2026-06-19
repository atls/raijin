import type { RaijinRuntimeManifest } from '../interfaces.js'

const INVALID_RUNTIME_MANIFEST_OBJECT_MESSAGE = 'Invalid Raijin runtime manifest: expected object'
const INVALID_RUNTIME_MANIFEST_SCHEMA_VERSION_MESSAGE =
  'Invalid Raijin runtime manifest: unsupported schemaVersion'
const INVALID_RUNTIME_MANIFEST_SHA256_MESSAGE = 'Invalid Raijin runtime manifest: invalid sha256'

const createInvalidRuntimeManifestFieldMessage = (key: keyof RaijinRuntimeManifest): string =>
  `Invalid Raijin runtime manifest: missing ${key}`

const createInvalidRuntimeManifestPackageMessage = (packageName: string): string =>
  `Invalid Raijin runtime manifest: expected ${packageName}`

const createInvalidRuntimeManifestAssetMessage = (assetName: string): string =>
  `Invalid Raijin runtime manifest: expected ${assetName}`

export class InvalidRaijinRuntimeManifestException extends Error {
  private constructor(message: string) {
    super(message)
    this.name = 'InvalidRaijinRuntimeManifestException'
  }

  static expectedObject(): InvalidRaijinRuntimeManifestException {
    return new InvalidRaijinRuntimeManifestException(INVALID_RUNTIME_MANIFEST_OBJECT_MESSAGE)
  }

  static unsupportedSchemaVersion(): InvalidRaijinRuntimeManifestException {
    return new InvalidRaijinRuntimeManifestException(
      INVALID_RUNTIME_MANIFEST_SCHEMA_VERSION_MESSAGE
    )
  }

  static missingField(key: keyof RaijinRuntimeManifest): InvalidRaijinRuntimeManifestException {
    return new InvalidRaijinRuntimeManifestException(createInvalidRuntimeManifestFieldMessage(key))
  }

  static unexpectedPackage(packageName: string): InvalidRaijinRuntimeManifestException {
    return new InvalidRaijinRuntimeManifestException(
      createInvalidRuntimeManifestPackageMessage(packageName)
    )
  }

  static unexpectedAsset(assetName: string): InvalidRaijinRuntimeManifestException {
    return new InvalidRaijinRuntimeManifestException(
      createInvalidRuntimeManifestAssetMessage(assetName)
    )
  }

  static invalidSha256(): InvalidRaijinRuntimeManifestException {
    return new InvalidRaijinRuntimeManifestException(INVALID_RUNTIME_MANIFEST_SHA256_MESSAGE)
  }
}
