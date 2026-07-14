import { StreamReport }               from '@yarnpkg/core'

import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { syncTypeScriptConfig }       from '@atls/raijin/config/sync'

import { AbstractRaijinSyncCommand }  from './base.js'
import { createRaijinSyncTarget }     from './target.js'

export class RaijinSyncTSConfigCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'tsconfig']]

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy(['raijin', 'sync', 'tsconfig'])
    }

    return this.executeRegular()
  }

  override async executeRegular(): Promise<number> {
    const { yarn } = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
    const { configuration, project } = yarn

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Raijin sync typescript config', async () => {
          const syncTarget = createRaijinSyncTarget(project)

          await syncTypeScriptConfig({
            cwd: syncTarget.cwd,
            workspacePatterns: syncTarget.workspaces,
          })
        })
      }
    )

    return commandReport.exitCode()
  }
}
