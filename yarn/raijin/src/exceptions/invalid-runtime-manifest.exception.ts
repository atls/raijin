import type { RaijinRuntimeManifest }                      from '../runtime.interfaces.js'

import { INVALID_RUNTIME_MANIFEST_OBJECT_MESSAGE }         from '../errors.js'
import { INVALID_RUNTIME_MANIFEST_SCHEMA_VERSION_MESSAGE } from '../errors.js'
import { INVALID_RUNTIME_MANIFEST_SHA256_MESSAGE }         from '../errors.js'
import { createInvalidRuntimeManifestAssetMessage }        from '../errors.js'
import { createInvalidRuntimeManifestFieldMessage }        from '../errors.js'
import { createInvalidRuntimeManifestPackageMessage }      from '../errors.js'

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
