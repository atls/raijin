import { spawn }                           from 'node:child_process'

import { BaseCommand }                     from '@yarnpkg/cli'

import { createServiceRuntimeEnvironment } from '@atls/code-service'
import { createServiceRuntimeExecArgv }    from '@atls/code-service'
import { createChildProcessOptions }       from '@atls/raijin/commands'
import { proxyWorkspaceCommand }           from '@atls/raijin/commands'
import { resolveWorkspaceInvocation }      from '@atls/raijin/commands'
import { shouldProxyCommand }              from '@atls/raijin/commands'
import { waitForChildProcess }             from '@atls/raijin/commands'
import { toNativeCwd }                     from '@atls/raijin/commands'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

  static override usage = BaseCommand.Usage({
    description: 'start a built service artifact',
  })

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return proxyWorkspaceCommand({
      args: ['service', 'start'],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const invocation = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
    const serviceCwd = toNativeCwd(invocation.executionCwd)

    const child = spawn(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(serviceCwd)), 'dist/index.js'],
      createChildProcessOptions({
        invocation,
        env: await createServiceRuntimeEnvironment(serviceCwd, process.env),
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      })
    )

    return waitForChildProcess(child)
  }
}
