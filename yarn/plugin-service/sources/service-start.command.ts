import type { WorkspaceCommandContext }    from '@atls/raijin/commands'

import { spawn }                           from 'node:child_process'
import { once }                            from 'node:events'

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

    const child = spawn(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(serviceCwd)), 'dist/index.js'],
      {
        cwd: serviceCwd,
        env: await createServiceRuntimeEnvironment(serviceCwd, this.context.env),
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      }
    )
    const [exitCode] = await once(child, 'close')

    return typeof exitCode === 'number' ? exitCode : 1
  }
}
