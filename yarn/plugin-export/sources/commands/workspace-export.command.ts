import type { PortablePath }                 from '@yarnpkg/fslib'

import { BaseCommand }                       from '@yarnpkg/cli'
import { StreamReport }                      from '@yarnpkg/core'
import { structUtils }                       from '@yarnpkg/core'
import { Option }                            from 'clipanion'

import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { packUtils }                         from '@atls/yarn-pack-utils'

export class WorkspaceExportCommand extends BaseCommand {
  static override paths = [['export']]

  destination: string = Option.String('-d,--destination', { required: true })

  async execute(): Promise<number> {
    const { configuration, project, workspace } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

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
