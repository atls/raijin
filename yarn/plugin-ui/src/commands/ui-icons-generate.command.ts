import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { StreamReport }  from '@yarnpkg/core'
import { MessageName }   from '@yarnpkg/core'

import { FormatterWorker } from '@atls/code-format-worker'
import { LinterWorker }    from '@atls/code-lint-worker'
import { IconsWorker }     from '@atls/code-icons-worker'
import { SpinnerProgress } from '@atls/yarn-run-utils'

export class UiIconsGenerateCommand extends BaseCommand {
  static paths = [['ui', 'icons', 'generate']]

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Icons compile', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          // eslint-disable-next-line
          progress.start()

          try {
            // eslint-disable-next-line
            await new IconsWorker(project.cwd).run(this.context.cwd)
            // eslint-disable-next-line
            await new FormatterWorker(project.cwd).run(this.context.cwd, [])
            // eslint-disable-next-line
            await new LinterWorker(project.cwd).run(this.context.cwd, [], {
              fix: true,
            })

            // eslint-disable-next-line
            progress.end()
          } catch (error) {
            // eslint-disable-next-line
            progress.end()

            report.reportError(
              MessageName.UNNAMED,
              error instanceof Error ? error.message : 'Error generate icons'
            )
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
