import type { WorkspaceCommandContext }    from '@atls/raijin/commands'

import { BaseCommand }                     from '@yarnpkg/cli'

import { createServiceRuntimeEnvironment } from '@atls/code-service'
import { createServiceRuntimeExecArgv }    from '@atls/code-service'
import { toNativeCwd }                     from '@atls/raijin/commands'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

  static override usage = BaseCommand.Usage({
    description: 'start a built service artifact',
  })

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const serviceCwd = toNativeCwd(invocation.executionCwd)

    const result = await invocation.child.execute(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(serviceCwd)), 'dist/index.js'],
      {
        nodeOptions: async (nodeOptions) =>
          (await createServiceRuntimeEnvironment(serviceCwd, { NODE_OPTIONS: nodeOptions }))
            .NODE_OPTIONS,
      }
    )

    return result.exitCode
  }
}
