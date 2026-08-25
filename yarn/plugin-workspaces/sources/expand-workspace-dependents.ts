import type { ChangedProjectState } from '@atls/yarn-plugin-files'
import type { Project }             from '@yarnpkg/core'

import { resolveProjectWorkspaces } from '@atls/yarn-plugin-files'
import { toWorkspaceIdentity }      from '@atls/yarn-plugin-files'

import { getWorkspaceDependents }   from './get-workspace-dependents.util.js'

export const expandWorkspaceDependents = (
  project: Project,
  state: ChangedProjectState
): ChangedProjectState => {
  const changedWorkspaces = resolveProjectWorkspaces(project, state.workspaces)
  const workspaces = new Set(changedWorkspaces)

  for (const workspace of changedWorkspaces) {
    getWorkspaceDependents(workspace).forEach((dependent) => workspaces.add(dependent))
  }

  return {
    ...state,
    workspaces: project.workspaces
      .filter((workspace) => workspaces.has(workspace))
      .map(toWorkspaceIdentity),
  }
}
