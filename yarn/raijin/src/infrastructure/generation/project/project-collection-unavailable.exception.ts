const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export class ProjectCollectionUnavailableException extends Error {
  constructor(cause: unknown) {
    super(`Project collection is unavailable: ${getErrorMessage(cause)}`, { cause })

    this.name = 'ProjectCollectionUnavailableException'
  }
}
