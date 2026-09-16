import type { WorkspaceCommandContext }  from '@atls/raijin/commands'

import { BaseCommand }                   from '@yarnpkg/cli'
import { Option }                        from 'clipanion'

import { createCommandInput }            from '@atls/raijin/commands'
import { toNativeCwd }                   from '@atls/raijin/commands'
import { getWorkspacePackageNames }      from '@atls/raijin/project'

import { runCheckPolicy }                from './policy.js'
import { resolveProjectTypecheckScopes } from './typecheck/projects.js'

export class CheckCommand extends BaseCommand {
  static override paths = [['check']]

  static override usage = BaseCommand.Usage({
    description: 'run Format, Lint, TypeCheck, unit and integration verification',
    examples: [
      ['Check the full project', 'yarn check'],
      ['Check one source file', 'yarn check packages/plugins/check/src/policy.ts'],
    ],
  })

  declare context: WorkspaceCommandContext

  verify = Option.Boolean('--verify', false)

  targets: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { project, workspace, invocationCwd } = invocation

    const cwd = toNativeCwd(project.cwd)
    const projectCwd = toNativeCwd(project.cwd)
    const targets =
      this.targets.length > 0
        ? createCommandInput({ cwd: invocationCwd, source: 'explicit', targets: this.targets })
        : undefined

    return runCheckPolicy({
      cwd,
      projectCwd,
      verify: this.verify,
      targets,
      typecheckScopes: targets
        ? undefined
        : await resolveProjectTypecheckScopes(invocation.yarn.project),
      workspacePackageNames: getWorkspacePackageNames(invocation.yarn.project),
      manifestPolicySources: (targets
        ? [project.topLevelWorkspace, workspace]
        : [project.topLevelWorkspace]
      ).map(({ cwd: sourceCwd, manifest }) => ({
        cwd: toNativeCwd(sourceCwd),
        ...(Object.hasOwn(manifest.raw, 'typecheckSkipLibCheck')
          ? { typecheckSkipLibCheck: manifest.raw.typecheckSkipLibCheck }
          : {}),
      })),
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }
}
