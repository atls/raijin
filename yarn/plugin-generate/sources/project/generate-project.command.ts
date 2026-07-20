import { BaseCommand }                    from '@yarnpkg/cli'
import { StreamReport }                   from '@yarnpkg/core'
import { Option }                         from 'clipanion'

import { generateProject }                from '@atls/raijin/application/generation'
import { resolveProjectScaffoldType }     from '@atls/raijin/application/generation'
import { resolveProjectInvocation }       from '@atls/raijin/commands'
import { toNativeCwd }                    from '@atls/raijin/commands'
import { createYarnProjectScaffolder }    from '@atls/raijin/infrastructure/generation'

import { renderProjectGenerationFailure } from './project-generation.renderer.js'
import { renderProjectGenerationResult }  from './project-generation.renderer.js'

export class GenerateProjectCommand extends BaseCommand {
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
    const scaffoldType = resolveProjectScaffoldType(this.type)
    const commandReport = await StreamReport.start(
      {
        configuration: yarn.configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        if (scaffoldType.status === 'rejected') {
          renderProjectGenerationFailure(report, scaffoldType.failure)

          return
        }

        const result = await generateProject(
          {
            scaffoldType: scaffoldType.scaffoldType,
            target: toNativeCwd(invocationCwd),
          },
          {
            scaffolder: createYarnProjectScaffolder(yarn),
          }
        )

        renderProjectGenerationResult(report, result)
      }
    )

    return commandReport.exitCode()
  }
}
