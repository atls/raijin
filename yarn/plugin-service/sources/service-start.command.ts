import type { WorkspaceInvocation }        from '@atls/raijin/commands'

import { BaseCommand }                     from '@yarnpkg/cli'

import { createServiceRuntimeEnvironment } from '@atls/code-service'
import { createServiceRuntimeExecArgv }    from '@atls/code-service'
import { defineCommandInvocation }         from '@atls/raijin/commands'
import { toNativeCwd }                     from '@atls/raijin/commands'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'start a built service artifact',
  })

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const serviceCwd = toNativeCwd(invocation.executionCwd)

    const child = invocation.child.spawn(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(serviceCwd)), 'dist/index.js'],
      {
        env: await createServiceRuntimeEnvironment(serviceCwd, process.env),
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      }
    )

    return invocation.child.wait(child)
  }
}
