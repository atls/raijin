import type { Project }                 from '@yarnpkg/core'
import type { Workspace }               from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ProjectType }             from './type.js'

import { getManifestWorkspacePatterns } from './manifest.js'
import { resolveProjectType }           from './type.js'

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
