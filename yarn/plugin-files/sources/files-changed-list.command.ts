import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { BaseCommand }              from '@yarnpkg/cli'
import { StreamReport }             from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { defineCommandInvocation }  from '@atls/raijin/commands'

import { getChangedFiles }          from './changed-files.util.js'

class FilesChangedListCommand extends BaseCommand {
  static override paths = [['files', 'changed', 'list']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'list files changed since the comparison base',
  })

  json = Option.Boolean('--json', false)

  async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { yarn } = invocation
    const { configuration, project } = yarn

    const commandReport = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report) => {
        const files = await getChangedFiles(project)

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
