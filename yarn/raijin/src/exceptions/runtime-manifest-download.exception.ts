import { createRuntimeManifestDownloadFailureMessage } from '../errors.js'

export class RaijinRuntimeManifestDownloadException extends Error {
  constructor(status: number) {
    super(createRuntimeManifestDownloadFailureMessage(status))
    this.name = 'RaijinRuntimeManifestDownloadException'
  }
}
