import type { ProjectManifestSource }   from './manifest.js'
import type { ProjectType }             from './type.js'

import { getManifestWorkspacePatterns } from './manifest.js'
import { resolveProjectType }           from './type.js'

export interface ProjectWorkspaceSource<TCwd extends string = string> {
  cwd: TCwd
  manifest: ProjectManifestSource
}

export interface ProjectSource<TWorkspace extends ProjectWorkspaceSource = ProjectWorkspaceSource> {
  topLevelWorkspace: TWorkspace
  workspaces: Iterable<TWorkspace>
}

export interface RaijinProjectModel<
  TWorkspace extends ProjectWorkspaceSource = ProjectWorkspaceSource,
> {
  cwd: TWorkspace['cwd']
  topLevelWorkspace: TWorkspace
  type: ProjectType
  workspacePatterns: Array<string>
  workspaces: Array<TWorkspace>
}

export const createProjectModel = <TWorkspace extends ProjectWorkspaceSource>(
  project: ProjectSource<TWorkspace>
): RaijinProjectModel<TWorkspace> => ({
  cwd: project.topLevelWorkspace.cwd,
  topLevelWorkspace: project.topLevelWorkspace,
  type: resolveProjectType(project),
  workspacePatterns: getManifestWorkspacePatterns(project.topLevelWorkspace.manifest),
  workspaces: Array.from(project.workspaces),
})
