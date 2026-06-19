import { createRuntimeAssetDownloadFailureMessage } from '../../errors.js'

export class RaijinRuntimeAssetDownloadException extends Error {
  constructor(status: number) {
    super(createRuntimeAssetDownloadFailureMessage(status))
    this.name = 'RaijinRuntimeAssetDownloadException'
  }
}
