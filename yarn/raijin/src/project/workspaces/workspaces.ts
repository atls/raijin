import type { ProjectSource }           from '../project.interfaces.js'
import type { ProjectWorkspaceSource }  from '../project.interfaces.js'
import type { RaijinProjectModel }      from '../project.interfaces.js'

import { getManifestWorkspacePatterns } from '../manifest/manifest.js'
import { resolveProjectType }           from '../type/type.js'

export const createProjectModel = <TWorkspace extends ProjectWorkspaceSource>(
  project: ProjectSource<TWorkspace>
): RaijinProjectModel<TWorkspace> => ({
  cwd: project.topLevelWorkspace.cwd,
  topLevelWorkspace: project.topLevelWorkspace,
  type: resolveProjectType(project),
  workspacePatterns: getManifestWorkspacePatterns(project.topLevelWorkspace.manifest),
  workspaces: Array.from(project.workspaces),
})
