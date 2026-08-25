import type { PullRequestChangedStateSource } from '../interfaces/source.js'

type PullRequestProviderOperation = 'initialize' | 'list-files' | 'read-metadata'

export class PullRequestProviderException extends Error {
  constructor(
    readonly operation: PullRequestProviderOperation,
    readonly source: PullRequestChangedStateSource,
    cause: unknown
  ) {
    super(`GitHub pull request ${operation} failed`, { cause })
    this.name = 'PullRequestProviderException'
  }
}
