import { spawn }                                 from 'node:child_process'

import { BaseCommand }                           from '@yarnpkg/cli'
import { xfs }                                   from '@yarnpkg/fslib'

import { createChildProcessOptions }             from '@atls/raijin/commands'
import { createYarnExecutable }                  from '@atls/raijin/commands'
import { resolveWorkspaceInvocation }            from '@atls/raijin/commands'
import { waitForChildProcess }                   from '@atls/raijin/commands'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from '../artifact/entrypoint.js'

export class RendererStartCommand extends BaseCommand {
  static override paths = [['renderer', 'start']]

  static override usage = BaseCommand.Usage({
    description: 'start a built renderer artifact',
  })

  override async execute(): Promise<number> {
    return this.executeRegular()
  }

  async executeRegular(): Promise<number> {
    const invocation = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
    const binFolder = await xfs.mktempPromise()
    const { env } = await createYarnExecutable({
      binFolder,
      locator: invocation.workspace.anchoredLocator,
      project: invocation.yarn.project,
      env: process.env,
    })

    const child = spawn(
      process.execPath,
      [`dist/${RENDERER_STANDALONE_SERVER_ENTRYPOINT}`],
      createChildProcessOptions({
        invocation,
        env,
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      })
    )

    return waitForChildProcess(child)
  }
}
