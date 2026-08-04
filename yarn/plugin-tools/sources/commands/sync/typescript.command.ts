import type { WorkspaceInvocation }  from '@atls/raijin/commands'

import { BaseCommand }               from '@yarnpkg/cli'
import { StreamReport }              from '@yarnpkg/core'

import { defineCommandInvocation }   from '@atls/raijin/commands'
import { getRaijinTypeScriptRange }  from '@atls/raijin/config/sync'
import { syncTypeScriptManifest }    from '@atls/raijin/config/sync'

import { AbstractRaijinSyncCommand } from './base.js'
import { createRaijinSyncTarget }    from './target.js'

export class RaijinSyncTypeScriptCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'typescript']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'synchronize the Raijin TypeScript dependency',
  })

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

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
