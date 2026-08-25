import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { createCommandInput }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'

import { writeCompleted }               from './presenters/completed.jsx'
import { writeManagedError }            from './presenters/error.js'
import { writeException }               from './presenters/exception.js'
import { typecheckProjectSources }      from './typecheck.js'

export class TypeCheckCommand extends BaseCommand {
  static override paths = [['typecheck']]

  static override usage = BaseCommand.Usage({
    description: 'type-check project sources',
  })

  declare context: WorkspaceCommandContext

  args: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const { invocationCwd, project, workspace } = this.context.invocation

    try {
      const input = createCommandInput({
        cwd: invocationCwd,
        source: 'explicit',
        targets: this.args,
      })
      const result =
        input.targets.length > 0
          ? await typecheckProjectSources({
              kind: 'files',
              files: input.targets.map(({ path }) => path),
            })
          : await typecheckProjectSources({
              kind: 'project',
              cwd: toNativeCwd(invocationCwd),
              projectCwd: toNativeCwd(project.cwd),
              manifestPolicySources: [project.topLevelWorkspace, workspace].map(({
                cwd,
                manifest,
              }) => ({
                cwd: toNativeCwd(cwd),
                ...(Object.hasOwn(manifest.raw, 'typecheckSkipLibCheck')
                  ? { typecheckSkipLibCheck: manifest.raw.typecheckSkipLibCheck }
                  : {}),
              })),
            })

      if (result.kind === 'error') {
        writeManagedError(this.context, result)

        return 1
      }

      writeCompleted(this.context, result)

      return result.exitCode
    } catch (error) {
      writeException(this.context, error)

      return 1
    }
  }
}
