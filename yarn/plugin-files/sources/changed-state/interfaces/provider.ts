import type { ChangedStateManagedError }       from './result.js'
import type { PullRequestChangedStateSource } from './source.js'

export interface PullRequestFilesProvider {
  readMetadata: (source: PullRequestChangedStateSource) => Promise<unknown>
  listFiles: (source: PullRequestChangedStateSource) => Promise<unknown>
}

export interface PullRequestMetadata {
  readonly base: string
  readonly head: string
}

export type PullRequestProviderResult =
  | Extract<ChangedStateManagedError, { readonly reason: 'missing-token' }>
  | {
      readonly kind: 'completed'
      readonly provider: PullRequestFilesProvider
    }
