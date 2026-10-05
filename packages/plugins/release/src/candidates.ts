import type { Project }   from '@yarnpkg/core'
import type { Workspace } from '@yarnpkg/core'

import { PortablePath }   from '@yarnpkg/fslib'
import { structUtils }    from '@yarnpkg/core'
import { ppath }          from '@yarnpkg/fslib'
import { UsageError }     from 'clipanion'

export const selectReleaseCandidates = (
  project: Project,
  explicit: Set<string>
): Array<Workspace> => {
  const candidates = project.workspaces.filter(
    (workspace) =>
      workspace.manifest.raw.private !== true &&
      workspace.manifest.name !== null &&
      workspace.manifest.version !== null &&
      !explicit.has(structUtils.stringifyIdent(workspace.manifest.name))
  )

  for (const workspace of candidates) {
    const containsWorkspace = project.workspaces.some(
      (child) =>
        child !== workspace &&
        ppath.contains(
          ppath.resolve(PortablePath.root, workspace.relativeCwd),
          ppath.resolve(PortablePath.root, child.relativeCwd)
        ) !== null
    )

    if (containsWorkspace) {
      throw new UsageError(
        `Cannot infer ${structUtils.stringifyIdent(workspace.manifest.name!)}: it contains another workspace; record an explicit Yarn version decision`
      )
    }
  }

  return candidates
}
