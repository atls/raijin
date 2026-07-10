import type { ProjectSource }           from './workspaces.js'
import type { ProjectWorkspaceSource }  from './workspaces.js'

import { getManifestWorkspacePatterns } from './manifest.js'

export type ProjectType = 'monorepo' | 'single'

export const resolveProjectType = <TWorkspace extends ProjectWorkspaceSource>(
  project: ProjectSource<TWorkspace>
): ProjectType =>
  getManifestWorkspacePatterns(project.topLevelWorkspace.manifest).length > 0
    ? 'monorepo'
    : 'single'
