import type { ProjectProcessInvocation } from '@atls/raijin/commands'
import type { Project }                  from '@yarnpkg/core'

import type { PullRequestFilesProvider } from './provider.js'
import type { ChangedStateSourceInput }  from './source.js'
import type { GitChangedStateSource }    from './source.js'
import type { PullRequestChangedStateSource } from './source.js'

interface ChangedProjectStateResolutionContext {
  readonly processInvocation: ProjectProcessInvocation
  readonly project: Project
}

export type ResolveChangedProjectStateInput =
  | ChangedProjectStateResolutionContext & {
      readonly kind: 'git'
      readonly provider?: never
      readonly source: GitChangedStateSource
    }
  | ChangedProjectStateResolutionContext & {
      readonly kind: 'pull-request'
      readonly provider: PullRequestFilesProvider
      readonly source: PullRequestChangedStateSource
    }

export interface ResolveChangedProjectStateEntrypointInput
  extends ChangedProjectStateResolutionContext {
  readonly source: ChangedStateSourceInput
}
