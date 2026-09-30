import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'

import { toNativeCwd }                  from '@atls/raijin/commands'

import { writeError }                   from '../logging/write.jsx'
import { startProject }                 from './run.js'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

  static override usage = BaseCommand.Usage({
    description: 'start a built service artifact',
  })

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const result = await startProject({
      application: invocation.application,
      cwd: toNativeCwd(invocation.executionCwd),
    })

    if (result.status === 'artifact-missing') {
      writeError(this.context, new Error('No complete service build artifact was found'))

      return 1
    }

    return result.execution.reason === 'completed' ? result.execution.exitCode : 1
  }
}
