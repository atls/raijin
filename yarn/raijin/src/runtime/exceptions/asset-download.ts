const createRuntimeAssetDownloadFailureMessage = (status: number): string =>
  `Failed to download Raijin runtime asset: ${status}`

export class RaijinRuntimeAssetDownloadException extends Error {
  constructor(status: number) {
    super(createRuntimeAssetDownloadFailureMessage(status))
    this.name = 'RaijinRuntimeAssetDownloadException'
  }
}
