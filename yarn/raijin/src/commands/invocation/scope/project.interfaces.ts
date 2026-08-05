import type { Configuration }              from '@yarnpkg/core'
import type { Project }                    from '@yarnpkg/core'
import type { Workspace }                  from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import type { InvocationExecutionContext } from '../execution/context.interfaces.js'

export interface ResolvedProjectScope {
  configuration: Configuration
  executionContext: InvocationExecutionContext
  invocationCwd: PortablePath
  project: Project
  workspace: Workspace | null
}
