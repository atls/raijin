import type { Configuration }          from '@yarnpkg/core'
import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'

import type { RaijinProjectModel }     from '../../project/index.js'

export interface ProjectInvocation {
  readonly executionCwd: PortablePath
  readonly invocationCwd: PortablePath
  readonly project: RaijinProjectModel<Workspace>
  readonly yarn: {
    configuration: Configuration
    project: YarnProject
  }
}

export interface WorkspaceInvocation extends ProjectInvocation {
  readonly workspace: Workspace
}
