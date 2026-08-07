import type { RaijinProjectModel }       from '@atls/raijin/project'
import type { Workspace }                from '@yarnpkg/core'
import type { PortablePath }             from '@yarnpkg/fslib'

import type { ProcessInvocation }        from '../capabilities/process.interfaces.js'
import type { ProjectProcessInvocation } from '../capabilities/process.interfaces.js'
import type { YarnRuntimeInvocation }    from '../capabilities/yarn.interfaces.js'

export interface EntryInvocation {
  readonly executionCwd: PortablePath
  readonly invocationCwd: PortablePath
  readonly process: ProcessInvocation
}

export interface ProjectInvocation extends EntryInvocation {
  readonly process: ProjectProcessInvocation
  readonly project: RaijinProjectModel<Workspace>
  readonly yarn: YarnRuntimeInvocation
}

export interface WorkspaceInvocation extends ProjectInvocation {
  readonly workspace: Workspace
}
