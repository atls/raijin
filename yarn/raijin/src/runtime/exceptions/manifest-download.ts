const createRuntimeManifestDownloadFailureMessage = (status: number): string =>
  `Failed to download Raijin runtime manifest: ${status}`

export class RaijinRuntimeManifestDownloadException extends Error {
  constructor(status: number) {
    super(createRuntimeManifestDownloadFailureMessage(status))
    this.name = 'RaijinRuntimeManifestDownloadException'
  }
}
