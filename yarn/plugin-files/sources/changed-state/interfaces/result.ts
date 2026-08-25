export type ChangedFileStatus =
  | 'added'
  | 'copied'
  | 'deleted'
  | 'modified'
  | 'renamed'
  | 'type-changed'
  | 'unmerged'

export interface ChangedProjectFile {
  readonly path: string
  readonly previousPath?: string
  readonly status: ChangedFileStatus
}

export interface ChangedWorkspaceIdentity {
  readonly path: string
}

export interface ChangedProjectState {
  readonly files: ReadonlyArray<ChangedProjectFile>
  readonly workspaces: ReadonlyArray<ChangedWorkspaceIdentity>
}

export type ChangedStateManagedError =
  | {
      readonly kind: 'error'
      readonly reason: 'incomplete-event'
      readonly eventName: 'pull_request' | 'push'
    }
  | {
      readonly kind: 'error'
      readonly reason: 'invalid-comparison'
      readonly source: 'git-range' | 'push'
    }
  | {
      readonly kind: 'error'
      readonly reason: 'missing-token'
    }
  | {
      readonly kind: 'error'
      readonly reason: 'stale-pull-request'
    }
  | {
      readonly kind: 'error'
      readonly reason: 'unsupported-event'
      readonly eventName: string
    }

export interface ChangedFilesCompletedResult {
  readonly files: ReadonlyArray<ChangedProjectFile>
  readonly kind: 'completed'
}

export type GitChangedFilesManagedError = Extract<
  ChangedStateManagedError,
  { readonly reason: 'invalid-comparison' }
>

export type PullRequestChangedFilesManagedError = Extract<
  ChangedStateManagedError,
  { readonly reason: 'stale-pull-request' }
>

export type GitChangedFilesResult =
  | ChangedFilesCompletedResult
  | GitChangedFilesManagedError

export type PullRequestChangedFilesResult =
  | ChangedFilesCompletedResult
  | PullRequestChangedFilesManagedError

export interface ChangedProjectStateCompletedResult {
  readonly kind: 'completed'
  readonly state: ChangedProjectState
}

export type ChangedProjectStateResolutionResult =
  | ChangedProjectStateCompletedResult
  | GitChangedFilesManagedError
  | PullRequestChangedFilesManagedError

export type ChangedProjectStateResult =
  | ChangedProjectStateCompletedResult
  | ChangedStateManagedError
