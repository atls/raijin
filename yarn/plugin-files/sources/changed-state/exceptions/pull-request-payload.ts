import type { PullRequestChangedStateSource } from '../interfaces/source.js'

export class PullRequestPayloadException extends Error {
  constructor(
    readonly operation: 'files' | 'metadata',
    readonly source: PullRequestChangedStateSource,
    readonly payload: unknown,
    cause: unknown = payload
  ) {
    super(`GitHub pull request ${operation} payload is invalid`, { cause })
    this.name = 'PullRequestPayloadException'
  }
}
