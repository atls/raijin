import type { Configuration } from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'
import type { PortablePath }  from '@yarnpkg/fslib'

export interface ResolvedProjectScope {
  configuration: Configuration
  invocationCwd: PortablePath
  project: Project
  workspace: Workspace | null
}
