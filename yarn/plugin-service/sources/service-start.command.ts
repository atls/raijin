import type { WorkspaceInvocation }        from '@atls/raijin/commands'

import { RaijinCommand }                   from '@atls/raijin/commands'
import { createServiceRuntimeEnvironment } from '@atls/code-service'
import { createServiceRuntimeExecArgv }    from '@atls/code-service'
import { toNativeCwd }                     from '@atls/raijin/commands'

export class ServiceStartCommand extends RaijinCommand {
  static override paths = [['service', 'start']]

  static override usage = RaijinCommand.Usage({
    description: 'start a built service artifact',
  })

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
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
