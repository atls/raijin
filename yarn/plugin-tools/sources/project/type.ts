import type { Project }                 from '@yarnpkg/core'

import { getManifestWorkspacePatterns } from './manifest.js'

export type ProjectType = 'monorepo' | 'single'

export const resolveProjectType = (project: Project): ProjectType =>
  getManifestWorkspacePatterns(project.topLevelWorkspace.manifest).length > 0
    ? 'monorepo'
    : 'single'
