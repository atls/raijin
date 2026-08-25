import type { Project }                  from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'

import type { ChangedProjectFile }       from './interfaces/result.js'
import type { ChangedWorkspaceIdentity } from './interfaces/result.js'

import { WorkspaceIdentityException }    from './exceptions/workspace-identity.js'

const containsProjectPath = (workspace: Workspace, path: string): boolean =>
  workspace.relativeCwd === '.' ||
  path === workspace.relativeCwd ||
  path.startsWith(`${workspace.relativeCwd}/`)

const findOwningWorkspace = (project: Project, path: string): Workspace | undefined =>
  project.workspaces.reduce<Workspace | undefined>((owner, workspace) => {
    if (!containsProjectPath(workspace, path)) {
      return owner
    }

    if (!owner || workspace.relativeCwd.length > owner.relativeCwd.length) {
      return workspace
    }

    return owner
  }, undefined)

export const toWorkspaceIdentity = (workspace: Workspace): ChangedWorkspaceIdentity => ({
  path: workspace.relativeCwd,
})

export const resolveProjectWorkspaces = (
  project: Project,
  identities: ReadonlyArray<ChangedWorkspaceIdentity>
): ReadonlyArray<Workspace> =>
  identities.map((identity) => {
    const workspace = project.workspaces.find(
      ({ relativeCwd }) => relativeCwd === identity.path)

    if (!workspace) {
      throw new WorkspaceIdentityException(identity)
    }

    return workspace
  })

export const resolveChangedWorkspaces = (
  project: Project,
  files: ReadonlyArray<ChangedProjectFile>
): ReadonlyArray<ChangedWorkspaceIdentity> => {
  const selected = new Set(
    files
      .flatMap(({ path, previousPath }) =>
        [path, previousPath].filter((candidate): candidate is string => Boolean(candidate)))
      .map((path) => findOwningWorkspace(project, path))
      .filter((workspace): workspace is Workspace => Boolean(workspace))
  )

  return project.workspaces.filter((workspace) => selected.has(workspace)).map(toWorkspaceIdentity)
}
