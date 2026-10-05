import type { Project }   from '@yarnpkg/core'
import type { Workspace } from '@yarnpkg/core'

import { structUtils }    from '@yarnpkg/core'

export const selectReleaseCandidates = (
  project: Project,
  explicit: Set<string>
): Array<Workspace> =>
  project.workspaces.filter(
    (workspace) =>
      workspace.manifest.raw.private !== true &&
      workspace.manifest.name !== null &&
      workspace.manifest.version !== null &&
      !explicit.has(structUtils.stringifyIdent(workspace.manifest.name))
  )
