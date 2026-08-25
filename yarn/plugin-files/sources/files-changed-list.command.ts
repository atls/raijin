import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { MessageName }                  from '@yarnpkg/core'
import { StreamReport }                 from '@yarnpkg/core'
import { Option }                       from 'clipanion'

import { formatChangedStateManagedError } from './changed-state/message.js'
import { resolveChangedProjectStateForEntrypoint } from './changed-state/resolve.js'

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
    const { configuration, project } = yarn

    const commandReport = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report) => {
        const result = await resolveChangedProjectStateForEntrypoint({
          processInvocation: invocation.process,
          project,
          source: { kind: 'working-tree' },
        })

        if (result.kind === 'error') {
          report.reportError(MessageName.UNNAMED, formatChangedStateManagedError(result))

          return
        }

        for (const file of result.state.files) {
          report.reportInfo(null, file.path)
          report.reportJson({
            location: file.path,
            previousLocation: file.previousPath ?? null,
            status: file.status,
          })
        }
      }
    )

    return commandReport.exitCode()
  }
}

export { FilesChangedListCommand }
