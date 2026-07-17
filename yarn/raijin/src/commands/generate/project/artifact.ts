import type { PortablePath } from '@yarnpkg/fslib'

import { ppath }             from '@yarnpkg/fslib'

export const PROJECT_GENERATION_ARTIFACT_PATH = '.yarn/schematic' as PortablePath

export const resolveProjectCollectionPath = (projectCwd: PortablePath): PortablePath =>
  ppath.join(projectCwd, PROJECT_GENERATION_ARTIFACT_PATH, 'collection.json')
