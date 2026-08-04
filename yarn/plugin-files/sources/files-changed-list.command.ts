import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { StreamReport }             from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { RaijinCommand }            from '@atls/raijin/commands'

import { getChangedFiles }          from './changed-files.util.js'

class FilesChangedListCommand extends RaijinCommand {
  static override paths = [['files', 'changed', 'list']]

  static override usage = RaijinCommand.Usage({
    description: 'list files changed since the comparison base',
  })

  json = Option.Boolean('--json', false)

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
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
