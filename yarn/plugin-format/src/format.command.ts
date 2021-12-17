import { BaseCommand }    from '@yarnpkg/cli'
import { StreamReport }   from '@yarnpkg/core'
import { Configuration }  from '@yarnpkg/core'
import { Project }        from '@yarnpkg/core'
import { Option }         from 'clipanion'

import type * as Runtime  from '@atls/yarn-runtime'

import { ProgressReport } from './progress.report'

class FormatCommand extends BaseCommand {
  static paths = [['format']]

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const { Formatter }: typeof Runtime = require('@atls/yarn-runtime') as typeof Runtime
    const formatter = new Formatter(project.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Format', async () => {
          await formatter.format(this.files, new ProgressReport(report))
        })
      }
    )

    return commandReport.exitCode()
  }
}

export { FormatCommand }
