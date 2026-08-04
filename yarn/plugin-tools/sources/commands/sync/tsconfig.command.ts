import type { WorkspaceInvocation }  from '@atls/raijin/commands'

import { StreamReport }              from '@yarnpkg/core'

import { syncTypeScriptConfig }      from '@atls/raijin/config/sync'

import { AbstractRaijinSyncCommand } from './base.js'
import { createRaijinSyncTarget }    from './target.js'

export class RaijinSyncTSConfigCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'tsconfig']]

  static override usage = AbstractRaijinSyncCommand.Usage({
    description: 'synchronize Raijin TypeScript configuration',
  })

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
    const { yarn } = invocation
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
