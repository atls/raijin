import type { Project }      from '@yarnpkg/core'
import type { Workspace }    from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

export type RaijinSyncTarget = {
  cwd: PortablePath
  workspace: Workspace
  workspaces: Array<string>
}

const getWorkspacePatterns = (workspaces: unknown): Array<string> =>
  Array.isArray(workspaces)
    ? workspaces.filter((workspace): workspace is string => typeof workspace === 'string')
    : []

export const createRaijinSyncTarget = (project: Project): RaijinSyncTarget => {
  const workspace = project.topLevelWorkspace

  return {
    cwd: workspace.cwd,
    workspace,
    workspaces: getWorkspacePatterns(workspace.manifest.raw.workspaces),
  }
}
