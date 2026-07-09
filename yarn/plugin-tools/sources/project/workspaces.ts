import type { Project }                 from '@yarnpkg/core'
import type { Workspace }               from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ProjectType }             from './type.js'

import { structUtils }                  from '@yarnpkg/core'

import { getManifestWorkspacePatterns } from './manifest.js'
import { hasManifestDependency }        from './manifest.js'
import { resolveProjectType }           from './type.js'

export const raijinIdent = structUtils.parseIdent('@atls/raijin')

export interface RaijinProjectModel {
  cwd: PortablePath
  topLevelWorkspace: Workspace
  type: ProjectType
  workspacePatterns: Array<string>
  workspaces: Array<Workspace>
}

export const createProjectModel = (project: Project): RaijinProjectModel => ({
  cwd: project.topLevelWorkspace.cwd,
  topLevelWorkspace: project.topLevelWorkspace,
  type: resolveProjectType(project),
  workspacePatterns: getManifestWorkspacePatterns(project.topLevelWorkspace.manifest),
  workspaces: Array.from(project.workspaces),
})

export const getLeafWorkspaces = (model: RaijinProjectModel): Array<Workspace> =>
  model.workspaces.filter((workspace) => workspace.cwd !== model.topLevelWorkspace.cwd)

export const getRaijinLeafDependencyWorkspaces = (model: RaijinProjectModel): Array<Workspace> =>
  getLeafWorkspaces(model).filter((workspace) =>
    hasManifestDependency(workspace.manifest, raijinIdent))
