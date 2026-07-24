import { BaseCommand }              from '@yarnpkg/cli'
import { StreamReport }             from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { resolveScaffoldType }      from '@atls/raijin/application/generation'
import { scaffoldProject }          from '@atls/raijin/application/generation'
import { resolveProjectInvocation } from '@atls/raijin/commands'
import { toNativeCwd }              from '@atls/raijin/commands'
import { createYarnScaffolder }     from '@atls/raijin/infrastructure/generation'

import { renderScaffoldFailure }    from './presentation/render.js'
import { renderScaffoldResult }     from './presentation/render.js'

export class Command extends BaseCommand {
  static override paths = [['generate', 'project']]

  static override usage = BaseCommand.Usage({
    description: 'generate a Raijin project scaffold',
  })

  type = Option.String('-t,--type', 'project')

  override async execute(): Promise<number> {
    const { invocationCwd, yarn } = await resolveProjectInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const scaffoldType = resolveScaffoldType(this.type)
    const commandReport = await StreamReport.start(
      {
        configuration: yarn.configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        if (scaffoldType.status === 'rejected') {
          renderScaffoldFailure(report, scaffoldType.failure)

          return
        }

        const result = await scaffoldProject(
          {
            scaffoldType: scaffoldType.scaffoldType,
            targetPath: toNativeCwd(invocationCwd),
          },
          {
            scaffolder: createYarnScaffolder(yarn),
          }
        )

        renderScaffoldResult(report, result)
      }
    )

    return commandReport.exitCode()
  }
}
