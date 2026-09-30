import type { Project }   from '@yarnpkg/core'
import type { Workspace } from '@yarnpkg/core'

import { Filename }       from '@yarnpkg/fslib'
import { structUtils }    from '@yarnpkg/core'
import { ppath }          from '@yarnpkg/fslib'
import { gitUtils }       from '@yarnpkg/plugin-git'

export const selectAffectedWorkspaces = (
  project: Project,
  changed: ReadonlySet<Workspace>
): ReadonlyArray<Workspace> => {
  if (changed.has(project.topLevelWorkspace)) {
    return [project.topLevelWorkspace]
  }

  const affected = new Set<Workspace>(changed)

  for (const workspace of changed) {
    for (const dependent of workspace.getRecursiveWorkspaceDependents()) {
      affected.add(dependent)
    }
  }

  if (affected.has(project.topLevelWorkspace)) {
    return [project.topLevelWorkspace]
  }

  return [...affected].sort((left, right) =>
    structUtils
      .stringifyIdent(left.anchoredLocator)
      .localeCompare(structUtils.stringifyIdent(right.anchoredLocator)))
}

export const resolveCheckWorkspaces = async (
  project: Project,
  since: string
): Promise<ReadonlyArray<Workspace>> => {
  const changed = await gitUtils.fetchChangedWorkspaces({ ref: since, project })
  const affected = selectAffectedWorkspaces(project, changed)
  const gitRoot = await gitUtils.fetchRoot(project.cwd)

  if (!gitRoot) {
    throw new Error('Git root is unavailable for changed-project verification')
  }

  const base = await gitUtils.fetchBase(gitRoot, { baseRefs: [since] })
  const files = await gitUtils.fetchChangedFiles(gitRoot, { base: base.hash, project })
  const lockfile = ppath.resolve(project.cwd, Filename.lockfile)

  if (files.includes(lockfile) || (affected.length === 0 && files.length > 0)) {
    return [project.topLevelWorkspace]
  }

  return affected
}
