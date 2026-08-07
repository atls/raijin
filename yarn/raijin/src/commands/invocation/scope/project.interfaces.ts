import type { Configuration }            from '@yarnpkg/core'
import type { Project }                  from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'
import type { PortablePath }             from '@yarnpkg/fslib'

import type { InvocationAdapterContext } from '../adapters/context.interfaces.js'

export interface ResolvedProjectScope {
  configuration: Configuration
  adapterContext: InvocationAdapterContext
  invocationCwd: PortablePath
  project: Project
  workspace: Workspace | null
}
