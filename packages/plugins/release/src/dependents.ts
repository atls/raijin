import type { Project }   from '@yarnpkg/core'
import type { Workspace } from '@yarnpkg/core'

import { structUtils }    from '@yarnpkg/core'
import { versionUtils }   from '@yarnpkg/plugin-version'

export const inferDependentDecisions = (
  project: Project,
  explicit: Set<string>,
  resolved: Map<Workspace, string>,
  inferred: Map<Workspace, string>
): Map<Workspace, string> => {
  const releases = new Map(resolved)
  const additions = new Map(inferred)

  for (const ident of explicit) {
    const workspace = project.getWorkspaceByIdent(structUtils.parseIdent(ident))

    if (!releases.has(workspace)) {
      releases.set(workspace, versionUtils.Decision.DECLINE)
    }
  }

  for (const [workspace, decision] of inferred) {
    releases.set(workspace, decision)
  }

  while (true) {
    const dependents = versionUtils.getUndecidedDependentWorkspaces({ project, releases })

    if (dependents.length === 0) {
      return additions
    }

    for (const [workspace] of dependents) {
      if (releases.has(workspace)) continue

      const decision =
        workspace.manifest.raw.private === true
          ? versionUtils.Decision.DECLINE
          : versionUtils.Decision.PATCH

      releases.set(workspace, decision)
      additions.set(workspace, decision)
    }
  }
}
