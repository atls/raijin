import { BaseCommand }     from '@yarnpkg/cli'
import { StreamReport }    from '@yarnpkg/core'
import { MessageName }     from '@yarnpkg/core'
import { Configuration }   from '@yarnpkg/core'
import { Project }         from '@yarnpkg/core'

import React               from 'react'
import { Option }          from 'clipanion'

import { ErrorInfo }       from '@atls/cli-ui-error-info-component-new'
import { FormatterWorker } from '@atls/code-format-worker-new'
import { SpinnerProgress } from '@atls/yarn-run-utils-new'
import { renderStatic }    from '@atls/cli-ui-renderer-new'

class FormatCommand extends BaseCommand {
  static paths = [['format']]

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Format', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          try {
            await new FormatterWorker(project.cwd).run(this.files)

            progress.end()
          } catch (error) {
            progress.end()

            renderStatic(<ErrorInfo error={error as Error} />, process.stdout.columns - 12)
              .split('\n')
              .forEach((line) => {
                report.reportError(MessageName.UNNAMED, line)
              })
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}

export { FormatCommand }
