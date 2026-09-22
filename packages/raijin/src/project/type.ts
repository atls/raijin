import type { ProjectSource }           from './project.interfaces.js'
import type { ProjectType }             from './project.interfaces.js'
import type { ProjectWorkspaceSource }  from './project.interfaces.js'

import { getManifestWorkspacePatterns } from './manifest.js'

export const resolveProjectType = <TWorkspace extends ProjectWorkspaceSource>(
  project: ProjectSource<TWorkspace>
): ProjectType =>
  getManifestWorkspacePatterns(project.topLevelWorkspace.manifest).length > 0
    ? 'monorepo'
    : 'single'
