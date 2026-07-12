import { spawn }                             from 'node:child_process'

import { BaseCommand }                       from '@yarnpkg/cli'

import { createServiceRuntimeEnvironment }   from '@atls/code-service'
import { createServiceRuntimeExecArgv }      from '@atls/code-service'
import { createCommandChildProcessOptions }  from '@atls/raijin/commands'
import { executeWorkspaceCommandProxy }      from '@atls/raijin/commands'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'
import { waitForCommandChild }               from '@atls/raijin/commands'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return executeWorkspaceCommandProxy({
      args: ['service', 'start'],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const invocation = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const { workspaceCwd } = invocation

    const child = spawn(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(workspaceCwd)), 'dist/index.js'],
      createCommandChildProcessOptions({
        invocation,
        env: await createServiceRuntimeEnvironment(workspaceCwd, process.env),
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      })
    )

    return waitForCommandChild(child)
  }
}
