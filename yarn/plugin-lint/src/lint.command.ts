import { StreamReport }   from '@yarnpkg/core'
import { Configuration }  from '@yarnpkg/core'
import { MessageName }    from '@yarnpkg/core'
import { Project }        from '@yarnpkg/core'
import { BaseCommand }    from '@yarnpkg/cli'
import { Option }         from 'clipanion'

import type * as Runtime  from '@atls/yarn-runtime'

import { ProgressReport } from './progress.report'

class LintCommand extends BaseCommand {
  static paths = [['lint']]

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const { Linter }: typeof Runtime = require('@atls/yarn-runtime') as typeof Runtime
    const linter = new Linter(project.cwd)

    const formatter = await linter.loadFormatter()

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const results = await report.startTimerPromise('Lint', async () =>
          linter.lint(this.files, new ProgressReport(report))
        )

        const output = formatter.format(results)

        if (output) {
          await report.startTimerPromise('Lint Output', async () => {
            output.split('\n').map((line) => report.reportError(MessageName.UNNAMED, line))
          })
        }
      }
    )

    return commandReport.exitCode()
  }
}

export { LintCommand }
