import { BaseCommand }     from '@yarnpkg/cli'
import { Configuration }   from '@yarnpkg/core'
import { StreamReport }    from '@yarnpkg/core'
import { MessageName }     from '@yarnpkg/core'
import { Project }         from '@yarnpkg/core'
import { Option }          from 'clipanion'
import React               from 'react'

import { ErrorInfo }       from '@atls/cli-ui-error-info-component'
import { LogRecord }       from '@atls/cli-ui-log-record-component'
import { ServiceWorker }   from '@atls/code-service-worker'
import { SpinnerProgress } from '@atls/yarn-run-utils'
import { renderStatic }    from '@atls/cli-ui-renderer'

class ServiceBuildCommand extends BaseCommand {
  static paths = [['service', 'build']]

  showWarnings = Option.Boolean('-w,--show-warnings', false)

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Service build', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          try {
            progress.start()

            // @ts-expect-error any
            const { errors, warnings } = await new ServiceWorker(this.context.cwd).run()

            progress.end()

            if (this.showWarnings) {
              warnings.forEach((warning: any) => {
                renderStatic(
                  <LogRecord name='webpack' body={warning} />,
                  process.stdout.columns - 12
                )
                  .split('\n')
                  .forEach((line) => {
                    report.reportWarning(MessageName.UNNAMED, line)
                  })
              })
            }

            errors.forEach((error: any) => {
              renderStatic(<LogRecord name='webpack' body={error} />, process.stdout.columns - 12)
                .split('\n')
                .forEach((line) => {
                  report.reportError(MessageName.UNNAMED, line)
                })
            })
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

export { ServiceBuildCommand }
