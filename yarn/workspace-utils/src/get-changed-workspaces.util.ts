import type { Project }           from '@yarnpkg/core'
import type { Workspace }         from '@yarnpkg/core'

import { getWorkspaceDependents } from './get-workspace-dependents.util.js'

export const getChangedWorkspaces = (
  project: Project,
  files: ReadonlyArray<string>
): ReadonlyArray<Workspace> => {
  const workspaces = new Set<Workspace>()

  for (const workspace of project.workspaces) {
    const changed = files.some((path) => path.startsWith(workspace.relativeCwd))

    if (changed && !workspaces.has(workspace)) {
      workspaces.add(workspace)

      for (const dependency of getWorkspaceDependents(workspace)) {
        workspaces.add(dependency)
      }
    }
  }

  return [...workspaces]
}
