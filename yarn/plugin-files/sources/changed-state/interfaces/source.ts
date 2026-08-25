import type { ChangedStateManagedError } from './result.js'

interface GitHubRepositoryInput {
  readonly owner: string
  readonly repo: string
}

interface PullRequestEventInput {
  readonly base: string
  readonly head: string
  readonly number: number
}

interface PushEventInput {
  readonly after: string
  readonly before: string
}

export interface GitHubActionsEventInput {
  readonly name: string
  readonly pullRequest?: PullRequestEventInput
  readonly push?: PushEventInput
  readonly repository?: GitHubRepositoryInput
}

export type GitRangeChangedStateSource = {
  readonly base: string
  readonly head: 'HEAD'
  readonly kind: 'git-range'
}

export type PullRequestChangedStateSource = {
  readonly base: string
  readonly head: string
  readonly kind: 'pull-request'
  readonly number: number
  readonly owner: string
  readonly repo: string
}

export type PushChangedStateSource = {
  readonly base: string
  readonly head: string
  readonly kind: 'push'
}

export type WorkingTreeChangedStateSource = {
  readonly kind: 'working-tree'
}

export type ChangedStateSourceInput =
  | GitRangeChangedStateSource
  | WorkingTreeChangedStateSource
  | {
      readonly event: GitHubActionsEventInput | undefined
      readonly kind: 'github-event'
    }

export type GitChangedStateSource =
  | GitRangeChangedStateSource
  | PushChangedStateSource
  | WorkingTreeChangedStateSource

export type ChangedStateSource = GitChangedStateSource | PullRequestChangedStateSource

export type ChangedStateSourceSelectionManagedError =
  | Extract<ChangedStateManagedError, { readonly reason: 'incomplete-event' }>
  | Extract<ChangedStateManagedError, { readonly reason: 'invalid-comparison' }>
  | Extract<ChangedStateManagedError, { readonly reason: 'unsupported-event' }>

export type ChangedStateSourceSelection =
  | ChangedStateSourceSelectionManagedError
  | {
      readonly kind: 'selected'
      readonly source: ChangedStateSource
    }
