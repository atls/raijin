import type { Configuration } from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'

export interface ProjectResolution {
  configuration: Configuration
  project: Project
  workspace: Workspace | null
}
