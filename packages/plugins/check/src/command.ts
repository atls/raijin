import type { WorkspaceCommandContext }  from '@atls/raijin/commands'

import { BaseCommand }                   from '@yarnpkg/cli'
import { Option }                        from 'clipanion'
import { UsageError }                    from 'clipanion'

import { createCommandInput }            from '@atls/raijin/commands'
import { toNativeCwd }                   from '@atls/raijin/commands'
import { toPortablePath }                from '@atls/raijin/filesystem'
import { getWorkspacePackageNames }      from '@atls/raijin/project'
import { resolveTypecheckProjectConfig } from '@atls/yarn-plugin-typescript'

import { runCheckPolicy }                from './policy.js'
import { selectTargetGroups }            from './targets/selection.js'
import { getTypecheckManifestSources }   from './typecheck/projects.js'
import { resolveProjectTypecheckScopes } from './typecheck/projects.js'
import { resolveTargetTypecheckScopes }  from './typecheck/projects.js'
import { resolveCheckWorkspaces }        from './workspaces/selection.js'

export class CheckCommand extends BaseCommand {
  static override paths = [['check']]

  static override usage = BaseCommand.Usage({
    description: 'run Format, Lint, TypeCheck, unit and integration verification',
    examples: [
      ['Repair the full project', 'yarn check'],
      ['Verify changed workspaces', 'yarn check --verify --since origin/main'],
      ['Check a package', 'yarn check packages/app'],
      ['Check one source file', 'yarn check packages/app/src/index.ts'],
    ],
  })

  declare context: WorkspaceCommandContext

  verify = Option.Boolean('--verify', false)

  since = Option.String('--since')

  targets: Array<string> = Option.Rest()

  override async execute(): Promise<number> {
    if (this.since && !this.verify) {
      throw new UsageError('--since requires --verify')
    }

    if (this.since && this.targets.length > 0) {
      throw new UsageError('--since cannot be combined with explicit targets')
    }

    const { invocation } = this.context
    const { project } = invocation.yarn
    const projectCwd = toNativeCwd(project.cwd)
    const workspacePackageNames = getWorkspacePackageNames(project)

    if (this.since) {
      const workspaces = await resolveCheckWorkspaces(project, this.since)

      if (workspaces.length === 0) {
        this.context.stdout.write('No workspaces changed\n')

        return 0
      }

      const checkedConfigs = new Set<string>()
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
          manifestPolicySources: getTypecheckManifestSources(project, configOwner),
          stdout: this.context.stdout,
          stderr: this.context.stderr,
        })

        failed ||= code !== 0
      }

      return failed ? 1 : 0
    }

    if (this.targets.length > 0) {
      const input = createCommandInput({
        cwd: invocation.invocationCwd,
        source: 'explicit',
        targets: this.targets,
      })
      const groups = await selectTargetGroups(project, input)
      let failed = false

      for await (const group of groups) {
        const code = await runCheckPolicy({
          cwd: toNativeCwd(group.workspace.cwd),
          projectCwd,
          verify: this.verify,
          targets: group.input,
          testTargets: group.directories.targets.length > 0 ? group.directories : undefined,
          typecheckScopes: await resolveTargetTypecheckScopes(project, group),
          workspacePackageNames,
          manifestPolicySources: getTypecheckManifestSources(project, group.workspace),
          stdout: this.context.stdout,
          stderr: this.context.stderr,
        })

        failed ||= code !== 0
      }

      return failed ? 1 : 0
    }

    return runCheckPolicy({
      cwd: projectCwd,
      projectCwd,
      verify: this.verify,
      typecheckScopes: await resolveProjectTypecheckScopes(project),
      workspacePackageNames,
      manifestPolicySources: getTypecheckManifestSources(project, project.topLevelWorkspace),
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }
}
