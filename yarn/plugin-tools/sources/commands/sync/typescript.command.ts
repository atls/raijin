import { StreamReport }               from '@yarnpkg/core'

import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { getRaijinTypeScriptRange }   from '@atls/raijin/config/sync'
import { syncTypeScriptManifest }     from '@atls/raijin/config/sync'

import { AbstractRaijinSyncCommand }  from './base.js'
import { createRaijinSyncTarget }     from './target.js'

export class RaijinSyncTypeScriptCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'typescript']]

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy(['raijin', 'sync', 'typescript'])
    }

    return this.executeRegular()
  }

  override async executeRegular(): Promise<number> {
    const { yarn } = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
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
