import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { StreamReport }                 from '@yarnpkg/core'
import { Option }                       from 'clipanion'

import { getChangedFiles }              from './changed-files.util.js'

class FilesChangedListCommand extends BaseCommand {
  static override paths = [['files', 'changed', 'list']]

  static override usage = BaseCommand.Usage({
    description: 'list files changed since the comparison base',
  })

  json = Option.Boolean('--json', false)

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
    const { configuration } = yarn

    const commandReport = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report) => {
        const files = await getChangedFiles(invocation.child)

        for (const file of files) {
          report.reportInfo(null, file)
          report.reportJson({
            location: file,
          })
        }
      }
    )

    return commandReport.exitCode()
  }
}

export { FilesChangedListCommand }
