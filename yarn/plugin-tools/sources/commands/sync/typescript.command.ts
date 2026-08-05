import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { StreamReport }                 from '@yarnpkg/core'

import { getRaijinTypeScriptRange }     from '@atls/raijin/config/sync'
import { syncTypeScriptManifest }       from '@atls/raijin/config/sync'

import { AbstractRaijinSyncCommand }    from './base.js'
import { createRaijinSyncTarget }       from './target.js'

export class RaijinSyncTypeScriptCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'typescript']]

  static override usage = AbstractRaijinSyncCommand.Usage({
    description: 'synchronize the Raijin TypeScript dependency',
  })

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
    const { configuration, project } = yarn

    await project.restoreInstallState()

    const raijinTypeScriptRange = getRaijinTypeScriptRange(project)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Raijin sync typescript version', async () => {
          const syncTarget = createRaijinSyncTarget(project)

          if (syncTypeScriptManifest(syncTarget.workspace.manifest, raijinTypeScriptRange)) {
            await project.persist()
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
