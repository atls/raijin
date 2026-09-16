import type { ProjectCommandContext }    from '@atls/raijin/commands'
import type { Project }                  from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'

import { BaseCommand }                   from '@yarnpkg/cli'
import { Filename }                      from '@yarnpkg/fslib'
import { structUtils }                   from '@yarnpkg/core'
import { ppath }                         from '@yarnpkg/fslib'
import { gitUtils }                      from '@yarnpkg/plugin-git'
import { Option }                        from 'clipanion'

import { toNativeCwd }                   from '@atls/raijin/commands'
import { toPortablePath }                from '@atls/raijin/filesystem'
import { getWorkspacePackageNames }      from '@atls/raijin/project'
import { runCheckPolicy }                from '@atls/yarn-plugin-check'
import { resolveProjectTypecheckScopes } from '@atls/yarn-plugin-check'
import { resolveTypecheckProjectConfig } from '@atls/yarn-plugin-typescript'

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
  since?: string
): Promise<ReadonlyArray<Workspace>> => {
  if (!since) {
    return [project.topLevelWorkspace]
  }

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

class ChecksRunCommand extends BaseCommand {
  static override paths = [['checks', 'run']]

  static override usage = BaseCommand.Usage({
    description: 'verify the active project or workspaces changed since a Git ref',
  })

  since = Option.String('--since')

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { project } = invocation.yarn
    const projectCwd = toNativeCwd(project.cwd)
    const workspaces = await resolveCheckWorkspaces(project, this.since)

    if (workspaces.length === 0) {
      this.context.stdout.write('No workspaces changed\n')

      return 0
    }

    const checkedConfigs = new Set<string>()
    const workspacePackageNames = getWorkspacePackageNames(project)
    let failed = false

    for await (const workspace of workspaces) {
      const cwd = toNativeCwd(workspace.cwd)
      const config = await resolveTypecheckProjectConfig(cwd, projectCwd)
      const skipTypecheck = config !== undefined && checkedConfigs.has(config)
      const configOwner = config
        ? (project.tryWorkspaceByFilePath(toPortablePath(config)) ?? project.topLevelWorkspace)
        : workspace

      if (config) {
        checkedConfigs.add(config)
      }

      this.context.stdout.write(`Checking ${workspace.relativeCwd}\n`)

      const code = await runCheckPolicy({
        cwd,
        projectCwd,
        verify: true,
        skipTypecheck,
        typecheckScopes:
          workspace === project.topLevelWorkspace
            ? await resolveProjectTypecheckScopes(project)
            : undefined,
        workspacePackageNames,
        manifestPolicySources: [project.topLevelWorkspace, configOwner].map(({
          cwd: sourceCwd,
          manifest,
        }) => ({
          cwd: toNativeCwd(sourceCwd),
          ...(Object.hasOwn(manifest.raw, 'typecheckSkipLibCheck')
            ? { typecheckSkipLibCheck: manifest.raw.typecheckSkipLibCheck }
            : {}),
        })),
        stdout: this.context.stdout,
        stderr: this.context.stderr,
      })

      if (code !== 0) {
        failed = true
      }
    }

    return failed ? 1 : 0
  }
}

export { ChecksRunCommand }
