import { BaseCommand }                       from '@yarnpkg/cli'
import { StreamReport }                      from '@yarnpkg/core'
import { Option }                            from 'clipanion'

import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'

import { getChangedFiles }                   from './changed-files.util.js'

class FilesChangedListCommand extends BaseCommand {
  static override paths = [['files', 'changed', 'list']]

  json = Option.Boolean('--json', false)

  async execute(): Promise<number> {
    const { configuration, project } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

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
