import { Workspace }                from '@yarnpkg/core'
import { structUtils }              from '@yarnpkg/core'

import { getWorkspaceDependencies } from './get-workspace-dependencies.util.js'

export const getWorkspaceDependents = (workspace: Workspace): ReadonlyArray<Workspace> => {
  const dependents = new Set<Workspace>()

  for (const ws of workspace.project.workspaces) {
    const isDependency = getWorkspaceDependencies(ws).some((dependency) =>
      structUtils.areLocatorsEqual(dependency.anchoredLocator, workspace.anchoredLocator))

    if (isDependency) {
      dependents.add(ws)
    }
  }

  return [...dependents]
}
