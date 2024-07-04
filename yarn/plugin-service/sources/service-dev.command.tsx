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
import { AbstractServiceCommand } from './abstract-service.command.jsx'

class ServiceDevCommand extends AbstractServiceCommand {
  static paths = [['service', 'dev']]

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
        await report.startTimerPromise('Service Development', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          try {
            await new ServiceWorker(project.cwd).watch(this.context.cwd, (logRecord: any) => {
              progress.end()

              this.renderLogRecord(logRecord, report)
            })
          } catch (error) {
            progress.end()

            this.renderLogRecord(error, report)
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}

export { ServiceDevCommand }
