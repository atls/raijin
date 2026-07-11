import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'
import type { PortablePath }  from '@yarnpkg/fslib'

import { createProjectModel } from '@atls/raijin/project'

export type RaijinSyncTarget = {
  cwd: PortablePath
  workspace: Workspace
  workspaces: Array<string>
}

export const createRaijinSyncTarget = (project: Project): RaijinSyncTarget => {
  const model = createProjectModel(project)

  return {
    cwd: model.cwd,
    workspace: model.topLevelWorkspace,
    workspaces: model.workspacePatterns,
  }
}
