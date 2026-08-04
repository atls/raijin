import type { WorkspaceInvocation } from '@atls/raijin/commands'
import type { PortablePath }        from '@yarnpkg/fslib'

import { BaseCommand }              from '@yarnpkg/cli'
import { StreamReport }             from '@yarnpkg/core'
import { structUtils }              from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { defineCommandInvocation }  from '@atls/raijin/commands'
import { packUtils }                from '@atls/yarn-pack-utils'

export class WorkspaceExportCommand extends BaseCommand {
  static override paths = [['export']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'export a workspace and its production dependencies',
  })

  destination: string = Option.String('-d,--destination', { required: true })

  async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { workspace, yarn } = invocation
    const { configuration, project } = yarn

    const report = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      // eslint-disable-next-line @typescript-eslint/no-shadow
      async (report) => {
        await packUtils.pack(
          configuration,
          project,
          workspace,
          report,
          this.destination as PortablePath
        )

        report.reportInfo(
          null,
          `Workspace ${
            workspace.manifest.name
              ? structUtils.prettyIdent(configuration, workspace.manifest.name)
              : workspace.relativeCwd
          } exported to ${this.destination}`
        )
      }
    )

    return report.exitCode()
  }
}
